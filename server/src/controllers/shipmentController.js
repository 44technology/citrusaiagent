import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const parseDateUTC = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  const dateString = String(dateStr);
  const matches = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matches) {
    return new Date(Date.UTC(
      parseInt(matches[1], 10),
      parseInt(matches[2], 10) - 1,
      parseInt(matches[3], 10)
    ));
  }
  return new Date(dateString);
};

const SHIPMENT_INCLUDE = {
  contact: { select: { id: true, name: true, company: true } },
  events: { orderBy: { eventDate: 'asc' } }
};

// ─── Shipments ────────────────────────────────────────────────

export const getShipments = async (req, res) => {
  try {
    const shipments = await prisma.shipment.findMany({
      orderBy: { createdAt: 'desc' },
      include: SHIPMENT_INCLUDE
    });
    res.json(shipments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
};

export const getShipmentsByContact = async (req, res) => {
  try {
    const shipments = await prisma.shipment.findMany({
      where: { contactId: req.params.contactId },
      orderBy: { createdAt: 'desc' },
      include: SHIPMENT_INCLUDE
    });
    res.json(shipments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
};

export const getShipment = async (req, res) => {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params.id },
      include: SHIPMENT_INCLUDE
    });
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
    res.json(shipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipment' });
  }
};

export const createShipment = async (req, res) => {
  try {
    const {
      label, origin, destination, vesselName, containerNumber, bolNumber,
      vesselEta, vesselDeparture, vesselArrival, shippingLine, status, notes, contactId,
      // Port details
      portOfLoading, portOfDischarge, transshipmentPort,
      // Container & cargo
      containerType, sealNumber, cargoDescription, grossWeight, numberOfBoxes,
      // Reefer
      reeferTempSet, reeferTempActual, humidity, ventilation, co2Level
    } = req.body;

    if (!label || !destination || !contactId) {
      return res.status(400).json({ error: 'Label, destination, and contactId are required' });
    }

    const shipment = await prisma.shipment.create({
      data: {
        label, origin: origin || null, destination,
        vesselName: vesselName || null, containerNumber: containerNumber || null,
        bolNumber: bolNumber || null,
        vesselEta: parseDateUTC(vesselEta),
        vesselDeparture: parseDateUTC(vesselDeparture),
        vesselArrival: parseDateUTC(vesselArrival),
        shippingLine: shippingLine || null,
        status: status || 'Pending',
        notes: notes || null,
        contactId,
        // Port
        portOfLoading: portOfLoading || null,
        portOfDischarge: portOfDischarge || null,
        transshipmentPort: transshipmentPort || null,
        // Container
        containerType: containerType || null,
        sealNumber: sealNumber || null,
        cargoDescription: cargoDescription || null,
        grossWeight: grossWeight ? parseFloat(grossWeight) : null,
        numberOfBoxes: numberOfBoxes ? parseInt(numberOfBoxes) : null,
        // Reefer
        reeferTempSet: reeferTempSet !== undefined && reeferTempSet !== '' ? parseFloat(reeferTempSet) : null,
        reeferTempActual: reeferTempActual !== undefined && reeferTempActual !== '' ? parseFloat(reeferTempActual) : null,
        humidity: humidity !== undefined && humidity !== '' ? parseFloat(humidity) : null,
        ventilation: ventilation !== undefined && ventilation !== '' ? parseFloat(ventilation) : null,
        co2Level: co2Level !== undefined && co2Level !== '' ? parseFloat(co2Level) : null,
      },
      include: SHIPMENT_INCLUDE
    });
    res.status(201).json(shipment);
  } catch (error) {
    console.error('Error creating shipment:', error);
    res.status(500).json({ error: 'Failed to create shipment: ' + error.message });
  }
};

export const updateShipment = async (req, res) => {
  try {
    const data = { ...req.body };

    if (data.vesselEta !== undefined) data.vesselEta = parseDateUTC(data.vesselEta);
    if (data.vesselDeparture !== undefined) data.vesselDeparture = parseDateUTC(data.vesselDeparture);
    if (data.vesselArrival !== undefined) data.vesselArrival = parseDateUTC(data.vesselArrival);

    // Parse numeric reefer fields
    const numericFields = ['reeferTempSet', 'reeferTempActual', 'humidity', 'ventilation', 'co2Level', 'grossWeight'];
    numericFields.forEach(f => {
      if (data[f] !== undefined) {
        data[f] = data[f] === '' || data[f] === null ? null : parseFloat(data[f]);
      }
    });
    if (data.numberOfBoxes !== undefined) {
      data.numberOfBoxes = data.numberOfBoxes === '' || data.numberOfBoxes === null ? null : parseInt(data.numberOfBoxes);
    }

    // Strip relation objects
    delete data.id; delete data.contact; delete data.events;
    delete data.createdAt; delete data.updatedAt; delete data.documents;

    const shipment = await prisma.shipment.update({
      where: { id: req.params.id },
      data,
      include: SHIPMENT_INCLUDE
    });
    res.json(shipment);
  } catch (error) {
    console.error('Error updating shipment:', error);
    res.status(500).json({ error: 'Failed to update shipment' });
  }
};

export const deleteShipment = async (req, res) => {
  const { role } = req.user || {};
  if (role !== 'super admin') {
    return res.status(403).json({ error: 'Only Super Admin can delete shipments' });
  }
  try {
    await prisma.shipment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete shipment' });
  }
};

// ─── Bulk Import ─────────────────────────────────────────────

export const importShipments = async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows provided' });
    }

    // Build customer lookup map: name/company → id
    const contacts = await prisma.contact.findMany({
      select: { id: true, name: true, company: true }
    });
    const contactMap = {};
    contacts.forEach(c => {
      if (c.name) contactMap[c.name.toLowerCase().trim()] = c.id;
      if (c.company) contactMap[c.company.toLowerCase().trim()] = c.id;
    });

    const results = { created: 0, failed: [], skipped: 0 };

    for (const row of rows) {
      try {
        // Resolve customer
        const customerKey = (row.customerName || '').toLowerCase().trim();
        const contactId = contactMap[customerKey] || null;

        if (!row.label) { results.failed.push({ row: row.label || '?', reason: 'Missing Shipment Number' }); continue; }

        await prisma.shipment.create({
          data: {
            label: String(row.label),
            status: row.status || 'Pending',
            vesselName: row.vesselName || null,
            containerNumber: row.containerNumber || null,
            vesselDeparture: parseDateUTC(row.etd),
            vesselEta: parseDateUTC(row.eta),
            portOfLoading: row.portOfLoading || null,
            transshipmentPort: row.transshipmentPort || null,
            portOfDischarge: row.portOfDischarge || null,
            destination: row.portOfDischarge || row.destination || 'TBD',
            origin: row.portOfLoading || null,
            containerType: row.containerType || null,
            sealNumber: row.sealNumber || null,
            cargoDescription: row.cargoDescription || null,
            grossWeight: row.grossWeight ? parseFloat(row.grossWeight) : null,
            numberOfBoxes: row.numberOfBoxes ? parseInt(row.numberOfBoxes) : null,
            reeferTempSet: row.reeferTempSet !== undefined && row.reeferTempSet !== '' ? parseFloat(row.reeferTempSet) : null,
            humidity: row.humidity !== undefined && row.humidity !== '' ? parseFloat(row.humidity) : null,
            ventilation: row.ventilation !== undefined && row.ventilation !== '' ? parseFloat(row.ventilation) : null,
            co2Level: row.co2Level !== undefined && row.co2Level !== '' ? parseFloat(row.co2Level) : null,
            contactId: contactId || null,
          }
        });
        results.created++;
      } catch (err) {
        results.failed.push({ row: row.label || '?', reason: err.message });
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Import failed: ' + error.message });
  }
};

// ─── Shipment Events ──────────────────────────────────────────

export const getEvents = async (req, res) => {
  try {
    const events = await prisma.shipmentEvent.findMany({
      where: { shipmentId: req.params.id },
      orderBy: { eventDate: 'asc' }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const createEvent = async (req, res) => {
  const { id: shipmentId } = req.params;
  const { eventType, location, description, eventDate, tempReading } = req.body;

  if (!eventType || !location || !eventDate) {
    return res.status(400).json({ error: 'eventType, location and eventDate are required' });
  }

  try {
    const event = await prisma.shipmentEvent.create({
      data: {
        shipmentId,
        eventType,
        location,
        description: description || null,
        eventDate: new Date(eventDate),
        tempReading: tempReading !== undefined && tempReading !== '' ? parseFloat(tempReading) : null
      }
    });

    // Auto-update shipment status based on event type
    const statusMap = {
      'Vessel Departed':              'Departed',
      'Transshipment Arrived':        'In Transit',
      'Transshipment Departed':       'In Transit',
      'Vessel Arrived':               'Arrived',
      'USDA / APHIS Inspection':      'Arrived',
      'CBP Customs Clearance':        'Arrived',
      'FDA Hold':                     'Arrived',
      'Released - Out for Delivery':  'Arrived',
      'Delivered to Warehouse':       'Arrived',
    };
    if (statusMap[eventType]) {
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: { status: statusMap[eventType] }
      });
    }

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event: ' + error.message });
  }
};

export const updateEvent = async (req, res) => {
  const { eventId } = req.params;
  try {
    const data = { ...req.body };
    if (data.eventDate) data.eventDate = new Date(data.eventDate);
    if (data.tempReading !== undefined) {
      data.tempReading = data.tempReading === '' ? null : parseFloat(data.tempReading);
    }
    const event = await prisma.shipmentEvent.update({ where: { id: eventId }, data });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event' });
  }
};

export const deleteEvent = async (req, res) => {
  const { eventId } = req.params;
  try {
    await prisma.shipmentEvent.delete({ where: { id: eventId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

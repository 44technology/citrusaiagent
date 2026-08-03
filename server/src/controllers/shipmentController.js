import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const calcWeek = (date) => {
  const d = new Date(date);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((Math.floor((d - jan1) / 86400000) + jan1.getDay() + 1) / 7);
};

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
  order: { select: { id: true, referenceId: true, product: true, variety: true } },
  events: { orderBy: { eventDate: 'asc' } },
  expenses: { orderBy: { createdAt: 'asc' } },
  activities: { orderBy: { createdAt: 'desc' }, take: 50 },
};

const logActivity = async (shipmentId, userName, action, detail = null) => {
  try {
    await prisma.shipmentActivity.create({ data: { shipmentId, userName, action, detail } });
  } catch {}
};

// ─── Shipments ────────────────────────────────────────────────

export const getShipments = async (req, res) => {
  try {
    const where = req.companyId ? { companyId: req.companyId } : {};
    const shipments = await prisma.shipment.findMany({
      where,
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
      label, referenceId, origin, destination, vesselName, containerNumber, bolNumber,
      vesselEta, vesselDeparture, vesselArrival, shippingLine, truckingCarrier, status, notes, contactId,
      // Port details
      portOfLoading, portOfDischarge, transshipmentPort,
      // Container & cargo
      containerType, sealNumber, cargoDescription, grossWeight, numberOfBoxes,
      pallets, packType, packBreakdown, product, variety, grower, category, qcArrival, gateInEmptyDate,
      soNumber, poNumber, isfSentDate,
      // Reefer
      reeferTempSet, reeferTempActual, humidity, ventilation, co2Level
    } = req.body;

    if (!label || !contactId) {
      return res.status(400).json({ error: 'Label and contactId are required' });
    }

    // Unique containerNumber check
    if (containerNumber) {
      const dup = await prisma.shipment.findFirst({ where: { containerNumber } });
      if (dup) return res.status(400).json({ error: `Container number "${containerNumber}" already exists on another shipment.` });
    }

    // Unique manual referenceId check
    if (referenceId) {
      const dup = await prisma.shipment.findFirst({ where: { referenceId } });
      if (dup) return res.status(400).json({ error: `Reference ID "${referenceId}" is already used by another shipment.` });
    }

    const shipment = await prisma.shipment.create({
      data: {
        label, referenceId: referenceId || null,
        origin: origin || null, destination: destination || portOfDischarge || 'TBD',
        vesselName: vesselName || null, containerNumber: containerNumber || null,
        bolNumber: bolNumber || null,
        vesselEta: parseDateUTC(vesselEta),
        vesselDeparture: parseDateUTC(vesselDeparture),
        vesselArrival: parseDateUTC(vesselArrival),
        shippingLine: shippingLine || null,
        truckingCarrier: truckingCarrier || null,
        status: status || 'Pending',
        notes: notes || null,
        contactId,
        orderId: req.body.orderId || null,
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
        pallets: pallets ? parseInt(pallets) : null,
        packType: packType || null,
        packBreakdown: packBreakdown || null,
        product: product || null,
        variety: variety || null,
        grower: grower || null,
        category: category || null,
        qcArrival: qcArrival || null,
        gateInEmptyDate: parseDateUTC(gateInEmptyDate),
        soNumber: soNumber || null,
        poNumber: poNumber || null,
        isfSentDate: parseDateUTC(isfSentDate),
        // Reefer
        reeferTempSet: reeferTempSet !== undefined && reeferTempSet !== '' ? parseFloat(reeferTempSet) : null,
        reeferTempActual: reeferTempActual !== undefined && reeferTempActual !== '' ? parseFloat(reeferTempActual) : null,
        humidity: humidity !== undefined && humidity !== '' ? parseFloat(humidity) : null,
        ventilation: ventilation !== undefined && ventilation !== '' ? parseFloat(ventilation) : null,
        co2Level: co2Level !== undefined && co2Level !== '' ? parseFloat(co2Level) : null,
        companyId: req.companyId || null,
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
    const existing = await prisma.shipment.findUnique({ where: { id: req.params.id }, select: { status: true, containerReleased: true } });
    const userName = req.user?.username || 'Unknown';
    const data = { ...req.body };

    if (data.vesselEta !== undefined) data.vesselEta = parseDateUTC(data.vesselEta);
    if (data.vesselDeparture !== undefined) data.vesselDeparture = parseDateUTC(data.vesselDeparture);
    if (data.vesselArrival !== undefined) data.vesselArrival = parseDateUTC(data.vesselArrival);
    if (data.demurrageLastFreeDay !== undefined) data.demurrageLastFreeDay = parseDateUTC(data.demurrageLastFreeDay);
    if (data.detentionLastFreeDay !== undefined) data.detentionLastFreeDay = parseDateUTC(data.detentionLastFreeDay);
    if (data.emptyReturnDate !== undefined) data.emptyReturnDate = parseDateUTC(data.emptyReturnDate);
    if (data.gateInEmptyDate !== undefined) data.gateInEmptyDate = parseDateUTC(data.gateInEmptyDate);
    if (data.isfSentDate !== undefined) data.isfSentDate = parseDateUTC(data.isfSentDate);

    // Handle contactId → contact relation
    let contactRelation = undefined;
    if (data.contactId !== undefined) {
      const cid = data.contactId;
      if (cid) contactRelation = { connect: { id: cid } };
    }
    delete data.contactId;

    // Empty string foreign keys must be null (undefined stays undefined = "not provided")
    if (data.orderId === '') data.orderId = null;

    // Parse float fields
    const floatFields = ['reeferTempSet', 'reeferTempActual', 'humidity', 'ventilation', 'co2Level', 'grossWeight', 'oceanFreight', 'advToGrower'];
    floatFields.forEach(f => {
      if (data[f] !== undefined) {
        data[f] = data[f] === '' || data[f] === null ? null : parseFloat(data[f]);
      }
    });
    // Parse int fields
    const intFields = ['numberOfBoxes', 'pallets'];
    intFields.forEach(f => {
      if (data[f] !== undefined) {
        data[f] = data[f] === '' || data[f] === null ? null : parseInt(data[f]);
      }
    });

    // Strip relation objects and unknown fields
    const STRIP = ['id','contact','events','expenses','order','createdAt','updatedAt','documents','companyId'];
    STRIP.forEach(f => delete data[f]);

    // Handle referenceId: try to link to order, else store as shipmentRefId
    let orderRelation = undefined;
    if (data.referenceId !== undefined) {
      const refId = String(data.referenceId || '').trim();
      delete data.referenceId;
      if (refId) {
        const order = await prisma.order.findFirst({ where: { referenceId: refId } });
        if (order) {
          orderRelation = { connect: { id: order.id } };
          data.shipmentRefId = null;
        } else {
          // Check if another shipment already uses this ref ID
          const dupRef = await prisma.shipment.findFirst({
            where: { shipmentRefId: refId, NOT: { id: req.params.id } }
          });
          if (dupRef) {
            return res.status(400).json({ error: `Reference ID "${refId}" is already used by another shipment.` });
          }
          orderRelation = { disconnect: true };
          data.shipmentRefId = refId;
        }
      } else {
        orderRelation = { disconnect: true };
        data.shipmentRefId = null;
      }
    } else if (data.orderId !== undefined) {
      const oid = data.orderId;
      if (oid) {
        orderRelation = { connect: { id: oid } };
      } else {
        orderRelation = { disconnect: true };
      }
    }
    delete data.orderId;

    // Only keep known Shipment fields
    const ALLOWED = new Set([
      'label','shipmentRefId','origin','destination','vesselName','containerNumber',
      'bolNumber','vesselEta','vesselDeparture','vesselArrival','shippingLine','truckingCarrier',
      'status','notes',
      'portOfLoading','portOfDischarge','transshipmentPort',
      'containerType','sealNumber','cargoDescription','grossWeight','numberOfBoxes',
      'pallets','packType','packBreakdown','product','variety','grower',
      'reeferTempSet','reeferTempActual','humidity','ventilation','co2Level',
      'advancePaymentStatus','transport','countryOfOrigin','oceanFreight',
      'advToGrower','qcArrival','soNumber','poNumber','category','gateInEmptyDate','isfSentDate',
      'demurrageLastFreeDay','detentionLastFreeDay','emptyReturnDate','containerReleased',
    ]);
    Object.keys(data).forEach(k => { if (!ALLOWED.has(k)) delete data[k]; });
    if (orderRelation !== undefined) data.order = orderRelation;
    if (contactRelation !== undefined) data.contact = contactRelation;

    const shipment = await prisma.shipment.update({
      where: { id: req.params.id },
      data,
      include: SHIPMENT_INCLUDE
    });

    // Activity logging
    const sid = req.params.id;
    const rawData = req.body;
    if (rawData.status && existing && rawData.status !== existing.status) {
      await logActivity(sid, userName, 'Status changed', `${existing.status} → ${rawData.status}`);
    } else if (rawData.containerReleased !== undefined && existing && rawData.containerReleased !== existing.containerReleased) {
      await logActivity(sid, userName, rawData.containerReleased ? 'Container released' : 'Container release unmarked');
    } else if (rawData.status) {
      await logActivity(sid, userName, 'Status updated', rawData.status);
    } else {
      const cargoFields = ['grower','variety','product','cargoDescription','grossWeight','numberOfBoxes','pallets','packType','advancePaymentStatus','soNumber'];
      const portsFields = ['portOfLoading','portOfDischarge','transshipmentPort','vesselName','shippingLine','bolNumber','vesselDeparture','vesselEta','vesselArrival','demurrageLastFreeDay','detentionLastFreeDay','emptyReturnDate'];
      const reeferFields = ['reeferTempSet','reeferTempActual','humidity','ventilation','co2Level'];
      const keys = Object.keys(rawData);
      if (keys.some(k => reeferFields.includes(k))) await logActivity(sid, userName, 'Updated reefer settings');
      else if (keys.some(k => portsFields.includes(k))) await logActivity(sid, userName, 'Updated ports & schedule');
      else if (keys.some(k => cargoFields.includes(k))) await logActivity(sid, userName, 'Updated cargo details');
      else if (rawData.notes !== undefined) await logActivity(sid, userName, 'Updated notes');
      else if (rawData.contactId !== undefined) await logActivity(sid, userName, 'Changed customer');
      else await logActivity(sid, userName, 'Updated shipment');
    }

    // Sync linked order status when shipment status changes
    if (rawData.status && shipment.orderId && existing && rawData.status !== existing.status) {
      const ORDER_STATUS_MAP = {
        'Departed':             'in-transit',
        'In Transit':           'in-transit',
        'Delivered':            'completed',
        'Empty Return Pending': 'completed',
        'Empty Returned':       'completed',
      };
      const newOrderStatus = ORDER_STATUS_MAP[rawData.status];
      if (newOrderStatus) {
        try {
          await prisma.order.update({ where: { id: shipment.orderId }, data: { status: newOrderStatus } });
        } catch {}
      }
    }

    res.json(shipment);
  } catch (error) {
    console.error('Error updating shipment:', error);
    res.status(500).json({ error: 'Failed to update shipment: ' + error.message });
  }
};

export const deleteShipment = async (req, res) => {
  const { role } = req.user || {};
  if (!['super admin', 'admin'].includes(role)) {
    return res.status(403).json({ error: 'Only Admin can delete shipments' });
  }
  try {
    await prisma.shipment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete shipment' });
  }
};

// ─── Bulk Import ─────────────────────────────────────────────

// Map raw Excel status strings → system status
const IMPORT_STATUS_MAP = {
  'SHIPPED ON BOARD':   'In Transit',
  'GATE IN EMPTY':      'Loading',
  'GATE IN':            'Loading',
  'LOADED ON BOARD':    'Departed',
  'VESSEL DEPARTED':    'Departed',
  'ARRIVED':            'Arrived',
  'DELIVERED':          'Delivered',
  'PENDING':            'Pending',
};

const resolveStatus = (raw) => {
  if (!raw) return 'Pending';
  const upper = String(raw).toUpperCase().trim();
  return IMPORT_STATUS_MAP[upper] || 'Pending';
};

export const importShipments = async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows provided' });
    }

    // Build contact lookup: name/company → id (case-insensitive)
    const contacts = await prisma.contact.findMany({
      select: { id: true, name: true, company: true }
    });
    const contactMap = {};
    contacts.forEach(c => {
      if (c.name)    contactMap[c.name.toLowerCase().trim()]    = c.id;
      if (c.company) contactMap[c.company.toLowerCase().trim()] = c.id;
    });

    // Find or create a default "Unknown" contact for rows with no match
    let fallbackContactId = null;
    const getOrCreateFallback = async (clientName) => {
      const key = (clientName || 'Unknown').toLowerCase().trim();
      if (contactMap[key]) return contactMap[key];

      // Create a new contact on the fly (phone required by schema)
      const created = await prisma.contact.create({
        data: {
          name:    clientName || 'Unknown',
          phone:   'N/A',
          email:   'N/A',
          company: clientName || 'Unknown',
          type:    'Customer',
          status:  'Active',
        }
      });
      contactMap[key] = created.id;
      return created.id;
    };

    // Pre-load existing container numbers for duplicate check
    const existingContainers = await prisma.shipment.findMany({
      select: { containerNumber: true },
      where: { containerNumber: { not: null } }
    });
    const existingSet = new Set(existingContainers.map(s => s.containerNumber.trim().toUpperCase()));

    const results = { created: 0, failed: [], skipped: 0, skippedRows: [] };

    for (const row of rows) {
      try {
        const containerNumber = row.containerNumber || null;
        const bolNumber       = row.bolNumber || null;

        // Skip duplicate containers
        if (containerNumber && existingSet.has(containerNumber.trim().toUpperCase())) {
          results.skipped++;
          results.skippedRows.push({ row: containerNumber, reason: 'Container already exists' });
          continue;
        }

        // Use BOL N or Container N as label (required field)
        const label = bolNumber || containerNumber || row.vesselName || 'Import';

        const contactId = await getOrCreateFallback(row.customerName);

        // Auto-link order by referenceId if provided
        let orderId = null;
        if (row.referenceId) {
          const order = await prisma.order.findFirst({
            where: { referenceId: String(row.referenceId).trim() }
          });
          if (order) orderId = order.id;
        }
        const shipmentRefId = row.referenceId ? String(row.referenceId).trim() : null;

        await prisma.shipment.create({
          data: {
            label,
            bolNumber,
            containerNumber,
            status:          resolveStatus(row.statusRaw),
            containerType:   row.containerType || null,
            grower:          row.grower || null,
            vesselName:      row.vesselName || null,
            shippingLine:    row.shippingLine || null,
            vesselDeparture: parseDateUTC(row.etd),
            vesselEta:       parseDateUTC(row.eta),
            vesselArrival:   parseDateUTC(row.arrivalDate),
            portOfLoading:   row.portOfLoading || null,
            portOfDischarge: row.portOfDischarge || null,
            origin:          row.portOfLoading || null,
            destination:     row.portOfDischarge || 'TBD',
            variety:         row.variety || null,
            numberOfBoxes:   row.numberOfBoxes ? parseInt(row.numberOfBoxes) : null,
            pallets:         row.pallets ? parseInt(row.pallets) : null,
            packType:        row.packType || null,
            notes:            row.notes || null,
            reeferTempSet:    row.reeferTempSet && row.reeferTempSet !== '' ? parseFloat(row.reeferTempSet) : null,
            transport:        row.transport || null,
            countryOfOrigin:  row.countryOfOrigin || null,
            oceanFreight:     row.oceanFreight && row.oceanFreight !== '' ? parseFloat(row.oceanFreight) : null,
            advToGrower:      row.advToGrower && row.advToGrower !== '' ? parseFloat(row.advToGrower) : null,
            qcArrival:        row.qcArrival || null,
            advancePaymentStatus: row.advancePaymentStatus || null,
            contactId,
            orderId:          orderId || null,
            referenceId:      shipmentRefId,
            companyId:        req.companyId || null,
          }
        });
        results.created++;
      } catch (err) {
        results.failed.push({ row: row.containerNumber || row.bolNumber || '?', reason: err.message });
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
      'Pre-Cooling':                  'Loading',
      'Stuffing':                     'Loading',
      'Gate In':                      'Loading',
      'Customs Cleared':              'Loading',
      'Vessel Departed':              'Departed',
      'Transshipment Arrived':        'Transshipment',
      'Transshipment Departed':       'In Transit',
      'Vessel Arrived':               'Arrived',
      'USDA / APHIS Inspection':      'Customs',
      'CBP Customs Clearance':        'Customs',
      'FDA Hold':                     'Customs',
      'Released - Out for Delivery':  'Delivered',
      'Delivered to Warehouse':       'Delivered',
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

// ─── Vessel ETA Sync ──────────────────────────────────────────────────────────

export const getShipmentsByVessel = async (req, res) => {
  const { vesselName, excludeId } = req.query;
  if (!vesselName) return res.json([]);
  try {
    const where = { vesselName, ...(excludeId ? { NOT: { id: excludeId } } : {}) };
    if (req.companyId) where.companyId = req.companyId;
    const ships = await prisma.shipment.findMany({
      where,
      select: { id: true, label: true, containerNumber: true, vesselEta: true, status: true }
    });
    res.json(ships);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const syncVesselEta = async (req, res) => {
  const { vesselName, vesselEta, excludeId } = req.body;
  const userName = req.user?.username || 'Unknown';
  if (!vesselName) return res.json({ updated: 0 });
  try {
    const where = { vesselName, ...(excludeId ? { NOT: { id: excludeId } } : {}) };
    if (req.companyId) where.companyId = req.companyId;
    const ships = await prisma.shipment.findMany({ where, select: { id: true } });
    const etaValue = parseDateUTC(vesselEta);
    for (const s of ships) {
      await prisma.shipment.update({ where: { id: s.id }, data: { vesselEta: etaValue } });
      await logActivity(s.id, userName, 'ETA updated via vessel sync', vesselEta || '—');
    }
    res.json({ updated: ships.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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
  order: { select: { id: true, referenceId: true, product: true, variety: true, purchasePrice: true } },
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
      soNumber, poNumber, isfSentDate, containerLastFreeDay,
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
        containerLastFreeDay: parseDateUTC(containerLastFreeDay),
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

// Human-readable labels for the shipment activity log — { date: true } fields
// are formatted as DD/MM/YY, everything else is shown as plain text.
const FIELD_META = {
  label: { label: 'Label' },
  origin: { label: 'Origin' },
  destination: { label: 'Destination' },
  vesselName: { label: 'Vessel Name' },
  containerNumber: { label: 'Container Number' },
  bolNumber: { label: 'BOL Number' },
  vesselEta: { label: 'ETA', date: true },
  vesselDeparture: { label: 'ATD', date: true },
  vesselArrival: { label: 'Arrival Date', date: true },
  shippingLine: { label: 'Shipping Line' },
  truckingCarrier: { label: 'Trucking Carrier' },
  notes: { label: 'Notes' },
  portOfLoading: { label: 'POL' },
  portOfDischarge: { label: 'POD' },
  transshipmentPort: { label: 'Transshipment Port' },
  containerType: { label: 'Container Type' },
  sealNumber: { label: 'Seal Number' },
  cargoDescription: { label: 'Cargo Description' },
  grossWeight: { label: 'Gross Weight' },
  numberOfBoxes: { label: 'Number of Boxes' },
  pallets: { label: 'Pallets' },
  packType: { label: 'Pack Type' },
  product: { label: 'Product' },
  variety: { label: 'Variety' },
  grower: { label: 'Grower' },
  category: { label: 'Category' },
  reeferTempSet: { label: 'Reefer Set Temp' },
  reeferTempActual: { label: 'Reefer Actual Temp' },
  humidity: { label: 'Humidity' },
  ventilation: { label: 'Ventilation' },
  co2Level: { label: 'CO2 Level' },
  advancePaymentStatus: { label: 'Advance Payment Status' },
  transport: { label: 'Transport Mode' },
  countryOfOrigin: { label: 'Country of Origin' },
  oceanFreight: { label: 'Ocean Freight' },
  advToGrower: { label: 'Advance to Grower' },
  qcArrival: { label: 'QC Score' },
  soNumber: { label: 'SO Number' },
  poNumber: { label: 'PO Number' },
  shipmentRefId: { label: 'Manual Ref ID' },
  gateInEmptyDate: { label: 'ATA (Gate-in Empty)', date: true },
  isfSentDate: { label: 'ISF Sent Date', date: true },
  containerLastFreeDay: { label: 'LFD', date: true },
  demurrageLastFreeDay: { label: 'DEM LFD', date: true },
  detentionLastFreeDay: { label: 'DET LFD', date: true },
  emptyReturnDate: { label: 'Empty Return Date', date: true },
};

const fmtActivityDate = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
};
const fmtActivityVal = (meta, v) => {
  if (v === null || v === undefined || v === '') return null;
  if (meta.date) return fmtActivityDate(v);
  return String(v);
};

export const updateShipment = async (req, res) => {
  try {
    // Fetch the full row (not just a couple of fields) so every field the
    // user can edit has a "before" value to diff against for the activity log.
    const existing = await prisma.shipment.findUnique({ where: { id: req.params.id } });
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
    if (data.containerLastFreeDay !== undefined) data.containerLastFreeDay = parseDateUTC(data.containerLastFreeDay);

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
      'advToGrower','qcArrival','soNumber','poNumber','category','gateInEmptyDate','isfSentDate','containerLastFreeDay',
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

    // Activity logging — one precise entry per field that actually changed,
    // so history always shows exactly what was edited, not just that
    // "something" was saved. Special-cased fields (status, released, customer,
    // order link, pack breakdown) get their own readable phrasing; everything
    // else in FIELD_META is diffed generically.
    const sid = req.params.id;
    let loggedSomething = false;

    if (data.status !== undefined && existing && data.status !== existing.status) {
      await logActivity(sid, userName, 'Status changed', `${existing.status} → ${data.status}`);
      loggedSomething = true;
    }
    if (data.containerReleased !== undefined && existing && data.containerReleased !== existing.containerReleased) {
      await logActivity(sid, userName, data.containerReleased ? 'Container released' : 'Container release unmarked');
      loggedSomething = true;
    }
    if (data.packBreakdown !== undefined && existing && data.packBreakdown !== existing.packBreakdown) {
      await logActivity(sid, userName, 'Box breakdown updated', data.packType || undefined);
      loggedSomething = true;
    }
    if (contactRelation !== undefined && existing && req.body.contactId && req.body.contactId !== existing.contactId) {
      try {
        const [oldC, newC] = await Promise.all([
          prisma.contact.findUnique({ where: { id: existing.contactId }, select: { name: true } }).catch(() => null),
          prisma.contact.findUnique({ where: { id: req.body.contactId }, select: { name: true } }).catch(() => null),
        ]);
        await logActivity(sid, userName, 'Customer changed', `${oldC?.name || 'Unknown'} → ${newC?.name || 'Unknown'}`);
      } catch {
        await logActivity(sid, userName, 'Customer changed');
      }
      loggedSomething = true;
    }
    if (orderRelation !== undefined && existing && (shipment.orderId || null) !== (existing.orderId || null)) {
      await logActivity(sid, userName, shipment.orderId ? 'Linked to order' : 'Unlinked from order',
        shipment.order?.referenceId ? `#${shipment.order.referenceId}` : undefined);
      loggedSomething = true;
    }

    for (const key of Object.keys(data)) {
      const meta = FIELD_META[key];
      if (!meta || !existing) continue;
      const oldRaw = existing[key];
      const newRaw = data[key];
      const oldCmp = meta.date ? (oldRaw ? new Date(oldRaw).getTime() : null) : (oldRaw ?? null);
      const newCmp = meta.date ? (newRaw ? new Date(newRaw).getTime() : null) : (newRaw ?? null);
      if (oldCmp === newCmp) continue;
      const oldFmt = fmtActivityVal(meta, oldRaw);
      const newFmt = fmtActivityVal(meta, newRaw);
      await logActivity(sid, userName, `${meta.label} changed`, oldFmt ? `${oldFmt} → ${newFmt || '—'}` : (newFmt || undefined));
      loggedSomething = true;
    }

    if (!loggedSomething) {
      await logActivity(sid, userName, 'Updated shipment');
    }

    // Sync linked order status when shipment status changes
    if (data.status && shipment.orderId && existing && data.status !== existing.status) {
      const ORDER_STATUS_MAP = {
        'Departed':             'in-transit',
        'In Transit':           'in-transit',
        'Delivered':            'completed',
        'Empty Return Pending': 'completed',
        'Empty Returned':       'completed',
      };
      const newOrderStatus = ORDER_STATUS_MAP[data.status];
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

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to parse date as UTC midnight to avoid timezone shifts
const parseDateUTC = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  const dateString = String(dateStr);
  const matches = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matches) {
    const year = parseInt(matches[1], 10);
    const month = parseInt(matches[2], 10) - 1;
    const day = parseInt(matches[3], 10);
    return new Date(Date.UTC(year, month, day));
  }
  return new Date(dateString);
};

// GET /api/shipments
export const getShipments = async (req, res) => {
  try {
    const shipments = await prisma.shipment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { contact: { select: { id: true, name: true, company: true } } }
    });
    res.json(shipments);
  } catch (error) {
    console.error('Error fetching shipments:', error);
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
};

// GET /api/shipments/contact/:contactId
export const getShipmentsByContact = async (req, res) => {
  try {
    const shipments = await prisma.shipment.findMany({
      where: { contactId: req.params.contactId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(shipments);
  } catch (error) {
    console.error('Error fetching shipments by contact:', error);
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
};

// GET /api/shipments/:id
export const getShipment = async (req, res) => {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params.id },
      include: { contact: { select: { id: true, name: true, company: true } } }
    });
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
    res.json(shipment);
  } catch (error) {
    console.error('Error fetching shipment:', error);
    res.status(500).json({ error: 'Failed to fetch shipment' });
  }
};

// POST /api/shipments
export const createShipment = async (req, res) => {
  try {
    const {
      label, origin, destination, vesselName, containerNumber, bolNumber,
      vesselEta, vesselDeparture, vesselArrival, shippingLine,
      status, notes, contactId
    } = req.body;

    if (!label || !destination || !contactId) {
      return res.status(400).json({ error: 'Label, destination, and contactId are required' });
    }

    // Log the incoming dates for debugging
    console.log(`Creating shipment. ETA: ${vesselEta}, DEP: ${vesselDeparture}, ARR: ${vesselArrival}`);

    const shipment = await prisma.shipment.create({
      data: {
        label,
        origin: origin || null,
        destination,
        vesselName: vesselName || null,
        containerNumber: containerNumber || null,
        bolNumber: bolNumber || null,
        vesselEta: parseDateUTC(vesselEta),
        vesselDeparture: parseDateUTC(vesselDeparture),
        vesselArrival: parseDateUTC(vesselArrival),
        shippingLine: shippingLine || null,
        status: status || 'Pending',
        notes: notes || null,
        contactId
      },
      include: { contact: { select: { id: true, name: true, company: true } } }
    });
    console.log('Shipment created successfully:', shipment.id);
    res.status(201).json(shipment);
  } catch (error) {
    console.error('Detailed Error creating shipment:', error);
    res.status(500).json({ error: 'Failed to create shipment: ' + error.message });
  }
};

// PATCH /api/shipments/:id
export const updateShipment = async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Log incoming update data
    console.log(`Updating shipment ${req.params.id}. Dates:`, {
      vesselEta: data.vesselEta,
      vesselDeparture: data.vesselDeparture,
      vesselArrival: data.vesselArrival
    });

    // Convert date strings to Date objects using UTC parsing
    if (data.vesselEta) data.vesselEta = parseDateUTC(data.vesselEta);
    if (data.vesselDeparture) data.vesselDeparture = parseDateUTC(data.vesselDeparture);
    if (data.vesselArrival) data.vesselArrival = parseDateUTC(data.vesselArrival);

    delete data.id; // Ensure we don't try to update the ID
    delete data.contact; // Ensure we don't try to update the relation object directly
    delete data.createdAt;
    delete data.updatedAt;

    const shipment = await prisma.shipment.update({
      where: { id: req.params.id },
      data,
      include: { contact: { select: { id: true, name: true, company: true } } }
    });
    res.json(shipment);
  } catch (error) {
    console.error('Error updating shipment:', error);
    res.status(500).json({ error: 'Failed to update shipment' });
  }
};

// DELETE /api/shipments/:id
export const deleteShipment = async (req, res) => {
  const { role } = req.user || {};
  if (role !== 'super admin') {
    return res.status(403).json({ error: 'Only Super Admin can delete shipments' });
  }

  try {
    await prisma.shipment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting shipment:', error);
    res.status(500).json({ error: 'Failed to delete shipment' });
  }
};

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    const shipment = await prisma.shipment.create({
      data: {
        label,
        origin: origin || null,
        destination,
        vesselName: vesselName || null,
        containerNumber: containerNumber || null,
        bolNumber: bolNumber || null,
        vesselEta: vesselEta ? new Date(vesselEta) : null,
        vesselDeparture: vesselDeparture ? new Date(vesselDeparture) : null,
        vesselArrival: vesselArrival ? new Date(vesselArrival) : null,
        shippingLine: shippingLine || null,
        status: status || 'Pending',
        notes: notes || null,
        contactId
      },
      include: { contact: { select: { id: true, name: true, company: true } } }
    });
    res.status(201).json(shipment);
  } catch (error) {
    console.error('Error creating shipment:', error);
    res.status(500).json({ error: 'Failed to create shipment' });
  }
};

// PATCH /api/shipments/:id
export const updateShipment = async (req, res) => {
  try {
    const data = { ...req.body };
    // Convert date strings to Date objects
    if (data.vesselEta) data.vesselEta = new Date(data.vesselEta);
    if (data.vesselDeparture) data.vesselDeparture = new Date(data.vesselDeparture);
    if (data.vesselArrival) data.vesselArrival = new Date(data.vesselArrival);

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
  try {
    await prisma.shipment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting shipment:', error);
    res.status(500).json({ error: 'Failed to delete shipment' });
  }
};

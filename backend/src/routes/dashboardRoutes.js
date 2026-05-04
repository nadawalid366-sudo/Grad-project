import express from 'express';
import { doctorDashboardSeed, patientDashboardSeed } from '../data/dashboardSeeds.js';
import { getDb } from '../db/mongoClient.js';

const router = express.Router();

async function getCollectionDocs(collectionName, query = {}, sort = {}, limit = 0) {
  const db = await getDb();
  let cursor = db.collection(collectionName).find(query);
  if (Object.keys(sort).length > 0) cursor = cursor.sort(sort);
  if (limit > 0) cursor = cursor.limit(limit);
  return cursor.toArray();
}

async function insertIfEmpty(collectionName, docs) {
  const db = await getDb();
  const collection = db.collection(collectionName);
  const count = await collection.countDocuments();
  if (count === 0 && docs.length > 0) {
    await collection.insertMany(docs.map((doc) => ({ ...doc, createdAt: new Date(), updatedAt: new Date() })));
  }
}

function normalizeLogType(type = '', title = '', subtitle = '', note = '') {
  const value = `${type} ${title} ${subtitle} ${note}`.toLowerCase();

  if (value.includes('meal') || value.includes('food') || value.includes('breakfast') || value.includes('lunch') || value.includes('dinner') || value.includes('snack')) {
    return 'meal';
  }

  if (value.includes('exercise') || value.includes('workout') || value.includes('walk') || value.includes('run') || value.includes('jog') || value.includes('activity')) {
    return 'exercise';
  }

  if (value.includes('vital') || value.includes('blood pressure') || value.includes('bp') || value.includes('glucose') || value.includes('pulse') || value.includes('heart rate')) {
    return 'vitals';
  }

  if (value.includes('medication') || value.includes('medicine') || value.includes('pill') || value.includes('dose') || value.includes('tablet')) {
    return 'medication';
  }

  if (value.includes('symptom') || value.includes('pain') || value.includes('headache') || value.includes('nausea') || value.includes('fever') || value.includes('cough')) {
    return 'symptom';
  }

  return 'symptom';
}

router.get('/patient/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const db = await getDb();
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await insertIfEmpty('patientLogs', [
      { email, type: 'meal', title: 'Breakfast', subtitle: 'Scrambled eggs', timestamp: '2h ago', createdAt: new Date(), updatedAt: new Date() },
      { email, type: 'exercise', title: 'Walk', subtitle: '30 min', timestamp: 'Yesterday', createdAt: new Date(), updatedAt: new Date() },
    ]);

    await insertIfEmpty('patientPlans', [
      { email, type: 'meal', title: 'Meal Plan', description: 'Balance carbs and protein', status: 'Active', createdAt: new Date(), updatedAt: new Date() },
    ]);

    const logs = await getCollectionDocs('patientLogs', { email }, { createdAt: -1 }, 20);
    const plans = await getCollectionDocs('patientPlans', { email }, { createdAt: -1 }, 20);
    const messages = await getCollectionDocs('patientMessages', { email }, { createdAt: 1 }, 50);

    return res.json({
      user: {
        email: user.email,
        fullName: user.profile?.fullName || user.email.split('@')[0],
        age: user.profile?.age || '',
        height: user.profile?.height || '',
        weight: user.profile?.weight || '',
        phone: user.phone || '',
      },
      metrics: patientDashboardSeed.metrics,
      recentActivities: patientDashboardSeed.recentActivities,
      quickActions: patientDashboardSeed.quickActions,
      logs,
      plans,
      messages,
      professionals: [],
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load patient dashboard.', error: String(error) });
  }
});

router.post('/patient/:email/logs', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { type, title, subtitle, note } = req.body;
    const normalizedType = normalizeLogType(type, title, subtitle, note);
    const db = await getDb();
    const result = await db.collection('patientLogs').insertOne({
      email,
      type: normalizedType,
      title,
      subtitle: subtitle || note || '',
      note: note || '',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return res.status(201).json({ message: 'Log saved.', logId: result.insertedId.toString() });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to save log.', error: String(error) });
  }
});

router.post('/patient/:email/plans', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { title, description, type } = req.body;
    const db = await getDb();
    const result = await db.collection('patientPlans').insertOne({
      email,
      title,
      description,
      type: type || 'general',
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return res.status(201).json({ message: 'Plan saved.', planId: result.insertedId.toString() });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to save plan.', error: String(error) });
  }
});

router.get('/doctor/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const db = await getDb();
    const doctor = await db.collection('doctors').findOne({ email });
    const profile = doctor || { email, doctorName: 'Doctor' };

    await insertIfEmpty('doctorAlerts', doctorDashboardSeed.alerts);
    await insertIfEmpty('doctorPatients', doctorDashboardSeed.patients);
    await insertIfEmpty('doctorPlans', doctorDashboardSeed.plans);
    await insertIfEmpty('doctorActivities', doctorDashboardSeed.patientActivity);

    const alerts = await getCollectionDocs('doctorAlerts', {}, { createdAt: -1 }, 50);
    const patients = await getCollectionDocs('doctorPatients', {}, { createdAt: -1 }, 50);
    const plans = await getCollectionDocs('doctorPlans', {}, { createdAt: -1 }, 50);
    const activities = await getCollectionDocs('doctorActivities', {}, { createdAt: -1 }, 50);

    return res.json({
      doctor: profile,
      metrics: doctorDashboardSeed.metrics,
      recentAlerts: alerts,
      patientActivity: activities,
      patients,
      plans,
      analytics: doctorDashboardSeed.analytics,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load doctor dashboard.', error: String(error) });
  }
});

router.post('/doctor-login', async (req, res) => {
  try {
    const { email, doctorName, specialty } = req.body;
    if (!email || !doctorName) {
      return res.status(400).json({ message: 'Email and doctorName are required.' });
    }

    const db = await getDb();
    const doctors = db.collection('doctors');
    const now = new Date();

    await doctors.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          email: email.toLowerCase(),
          doctorName,
          specialty: specialty || 'General Practitioner',
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return res.json({ message: 'Doctor signed in.', doctor: { email: email.toLowerCase(), doctorName, specialty: specialty || 'General Practitioner' } });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to sign in doctor.', error: String(error) });
  }
});

router.post('/doctor/:email/plans', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { patientName, patientAge, planType, status, startDate, endDate, adherence, description, goals } = req.body;
    const db = await getDb();
    const result = await db.collection('doctorPlans').insertOne({
      doctorEmail: email,
      patientName,
      patientAge,
      planType,
      status,
      startDate,
      endDate,
      adherence,
      description,
      goals,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return res.status(201).json({ message: 'Doctor plan saved.', planId: result.insertedId.toString() });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to save doctor plan.', error: String(error) });
  }
});

router.get('/doctor/:email/alerts', async (req, res) => {
  try {
    const alerts = await getCollectionDocs('doctorAlerts', {}, { createdAt: -1 }, 50);
    return res.json({ alerts });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load alerts.', error: String(error) });
  }
});

router.patch('/doctor/:email/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const db = await getDb();
    await db.collection('doctorAlerts').updateOne({ id: alertId }, { $set: { isResolved: true, updatedAt: new Date() } });
    return res.json({ message: 'Alert resolved.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to resolve alert.', error: String(error) });
  }
});

router.get('/doctor/:email/patients', async (_req, res) => {
  try {
    const patients = await getCollectionDocs('doctorPatients', {}, { createdAt: -1 }, 50);
    return res.json({ patients });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load patients.', error: String(error) });
  }
});

router.get('/doctor/:email/analytics', async (_req, res) => {
  try {
    return res.json(doctorDashboardSeed.analytics);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load analytics.', error: String(error) });
  }
});

router.get('/messages/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    await insertIfEmpty('patientMessages', patientDashboardSeed.messages.flatMap((doctor) =>
      doctor.conversation.map((message) => ({
        email,
        doctorId: doctor.doctorId,
        doctorName: doctor.doctorName,
        specialty: doctor.specialty,
        isOnline: doctor.isOnline,
        lastMessage: doctor.lastMessage,
        lastMessageTime: doctor.lastMessageTime,
        unreadCount: doctor.unreadCount,
        sender: message.sender,
        message: message.message,
        timestamp: message.timestamp,
        isRead: message.isRead,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    ));

    const messages = await getCollectionDocs('patientMessages', { email }, { createdAt: 1 }, 100);
    return res.json({ messages });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load messages.', error: String(error) });
  }
});

router.post('/messages/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { doctorId, doctorName, message } = req.body;
    const db = await getDb();
    const result = await db.collection('patientMessages').insertOne({
      email,
      doctorId,
      doctorName,
      sender: 'patient',
      message,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return res.status(201).json({ message: 'Message sent.', messageId: result.insertedId.toString() });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to send message.', error: String(error) });
  }
});

export default router;
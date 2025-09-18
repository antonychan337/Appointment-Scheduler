import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database';
import ownerRoutes from './routes/ownerRoutes';
import customerRoutes from './routes/customerRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import serviceRoutes from './routes/serviceRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/owners', ownerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/services', serviceRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    await sequelize.sync({ alter: true });
    console.log('Database synchronized.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
  }
};

startServer();
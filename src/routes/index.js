import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import profileRoutes from './profile.routes.js';
import roleRoutes from './role.routes.js';
import groupRoutes from './group.routes.js';
import participantRoutes from './participant.routes.js';
import planRoutes from './plan.routes.js';
import itineraryRoutes from './itinerary.routes.js';
import stepRoutes from './step.routes.js';
import timeRoutes from './time.routes.js';
import locationRoutes from './location.routes.js';
import routeRoutes from './route.routes.js';
import windowRoutes from './window.routes.js';
import timeslotRoutes from './timeslot.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/profiles', profileRoutes);
router.use('/roles', roleRoutes);
router.use('/groups', groupRoutes);
router.use('/participants', participantRoutes);
router.use('/plans', planRoutes);
router.use('/itineraries', itineraryRoutes);
router.use('/steps', stepRoutes);
router.use('/times', timeRoutes);
router.use('/locations', locationRoutes);
router.use('/routes', routeRoutes);
router.use('/windows', windowRoutes);
router.use('/timeslots', timeslotRoutes);

export default router;

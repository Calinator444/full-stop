import { cert, initializeApp } from 'firebase-admin/app';
import { type Challenge } from './types/challenge';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';
import {
   AngularNodeAppEngine,
   createNodeRequestHandler,
   isMainModule,
   writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const initializeAppAsync = async () => {
   const key = process.env['FIRESTORE_SERVICE_ACCOUNT_KEY'];
   if (!key) {
      throw Error('FIRESTORE_SERVICE_ACCOUNT_KEY environment variable not set');
   }
   const parsed = await JSON.parse(key);
   initializeApp({
      credential: cert(parsed),
   });

   const db = getFirestore();
   return db;
};

const db = await initializeAppAsync();

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

app.get('/api/challenges', async (req, res) => {
   const challengeRef = db.collection('challenges');
   const challenges = await challengeRef.get();
   res.contentType('application/json');
   res.json(
      challenges.docs.map((doc) => {
         return {
            id: doc.id,
            ...doc.data(),
         };
      })
   );
});

app.get('/api/challenges/:id', async (req, res) => {
   const challengeId = req.params['id'];
   const challengeRef = db.collection('challenges').doc(challengeId);
   const challenge = await challengeRef.get();
   if (!challenge.exists) {
      res.status(404).send('Challenge not found');
      return;
   }
   res.contentType('application/json');
   res.json(challenge.data());
});

app.post('/api/games/:gameId/play', async (req, res) => {
   const gameId = req.params['gameId'];
   const gameRef = db.collection('games').doc(gameId);

   const game = await gameRef.get();
   if (!game.exists) {
      res.status(404).send('Game not found');
      return;
   }

   const { challenge } = game.data() as {
      challenge: FirebaseFirestore.DocumentReference;
   };
   const challengeDoc = await challenge.get();
   const { coordinates, image } = challengeDoc.data() as Challenge;
   res.contentType('application/json');
   res.json({
      image,
      coordinates,
   });
});

app.post('/api/games/:challengeId/start', async (req, res) => {
   const challenge = await db
      .collection('challenges')
      .doc(req.params['challengeId'])
      .get();
   if (!challenge.exists) {
      res.status(404).send('Challenge not found');
      return;
   }
   const gameRef = await db.collection('games').doc();

   await gameRef.set({
      challenge: challenge.ref,
      startedAt: new Date(),
   });
   res.status(200).json({ gameId: gameRef.id });
});

// app.post('/api/challenges/:id/guess', async (req, res) => {
//    const challengeId = req.params['id'];

//    db.collection('guesses').add({
//       challengeId,
//       latitude: req.body.latitude,
//       longitude: req.body.longitude,
//    });

//    const challenge = await db.collection('challenges').doc(challengeId).get();
//    if (!challenge.exists) {
//       res.status(404).send('Challenge not found');
//       return;
//    }
//    const { _latitude, _longitude } = challenge.data() as {
//       _latitude: number;
//       _longitude: number;
//    };

//    const distance = haversone(
//       _latitude,
//       _longitude,
//       req.body.latitude,
//       req.body.longitude
//    );

//    res.redirect(`/challenges/${challengeId}/result`);
// });

/**
 * Serve static files from /browser
 */
app.use(
   express.static(browserDistFolder, {
      maxAge: '1y',
      index: false,
      redirect: false,
   })
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
   angularApp
      .handle(req)
      .then((response) =>
         response ? writeResponseToNodeResponse(response, res) : next()
      )
      .catch(next);
});

// Haversone formula based on the following resource: https://www.movable-type.co.uk/scripts/latlong.html
const haversone = (lat1: number, lon1: number, lat2: number, lon2: number) => {
   const R = 6371000; // metres
   const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
   const φ2 = (lat2 * Math.PI) / 180;
   const Δφ = ((lat2 - lat1) * Math.PI) / 180;
   const Δλ = ((lon2 - lon1) * Math.PI) / 180;

   const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

   const d = R * c; // in metres

   return d;
};

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
   const port = process.env['PORT'] || 4000;
   app.listen(port, (error) => {
      if (error) {
         throw error;
      }
      console.log(`Node Express server listening on http://localhost:${port}`);
   });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

// interface Challenge {
//    _latitude: number;
//    _longitude: number;
//    image: string;
// }

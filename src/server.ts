import { cert, initializeApp } from 'firebase-admin/app';
import { type Challenge } from './types/challenge';
import { FieldValue, GeoPoint, getFirestore } from 'firebase-admin/firestore';
import { Game as GameSesion } from './types/game';
import 'dotenv/config';
import {
   AngularNodeAppEngine,
   createNodeRequestHandler,
   isMainModule,
   writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { GuessResponse } from './types/api/guess';

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
app.use(express.json()); // <-- Add this line

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

type Game = {
   challenges: FirebaseFirestore.DocumentReference<
      Challenge & { order: number }
   >[];
   startedAt: Date;
   guesses: {
      coordinates: Coordinates;
      score: number;
   }[];
};

app.post<{ gameId: string }, GameSesion | string>(
   '/api/games/:gameId/play',
   async (req, res) => {
      const gameId = req.params['gameId'];

      const gameRef = db
         .collection('games')
         .withConverter(GameConverter)
         .doc(gameId);

      const gameResponse = await gameRef.get();

      const gameData = gameResponse.data();
      if (!gameResponse.exists || !gameData) {
         res.status(404).send('Game not found');
         return;
      }

      console.log('gameData', gameData);
      const challenges = await Promise.all(
         gameData.challenges.map(async (challenge) => {
            const challengeDoc = await challenge.get();

            const challengeData = challengeDoc.data();

            if (!challengeDoc.exists || !challengeData) {
               throw new Error('Challenge does not exist');
            }

            const { coordinates, image } = challengeData;
            return { id: challengeDoc.id, coordinates, image };
         })
      );

      const { guesses } = gameData;

      // const challengeDoc = await challenge.get();

      res.contentType('application/json');
      res.json({
         gameId: gameId,
         challenges: challenges,
         guesses,
      });
   }
);

app.post('/api/games/start', async (req, res) => {
   const challenges = await db
      .collection('challenges')
      .withConverter(ChallengeConverter)
      .get();

   const gameRef = await db
      .collection('games')
      .withConverter(GameConverter)
      .doc();

   const sortedDocs = challenges.docs.sort(
      (a, b) => a.data().order - b.data().order
   );
   await gameRef.set({
      startedAt: new Date(),
      challenges: sortedDocs.map((doc) => doc.ref),
      guesses: [],
   });

   res.status(200).json({
      gameId: gameRef.id,
   });
});

// fractions of a metre are truncated
/*

*  scoring curve:
* 0 - 5 metres: 100 points
* 5 - 10 metres: 50 points
* 10 - 20 metres: 40 points
* 20-30 metres: 30 points
* 30-40 metres: 20 points
* 40-50 metres: 10 points
*/

type GuessRequest = {
   _latitude: number;
   _longitude: number;
   challengeId: string;
   level: number;
};

const converter = <T>() => ({
   toFirestore: (data: T) => data,
   fromFirestore: (snap: FirebaseFirestore.QueryDocumentSnapshot) =>
      snap.data() as T,
});

const GameConverter = converter<Game>();

const ChallengeConverter = converter<Challenge & { order: number }>();

app.post<{ gameId: string }, GuessResponse | string, GuessRequest>(
   '/api/games/:gameId/guess',
   async (req, res) => {
      const gameId = req.params['gameId'];

      const gameRef = db
         .collection('games')
         .doc(gameId)
         .withConverter(converter<Game>());

      const gameDoc = await gameRef.get();

      const gameData = gameDoc.data();

      if (!gameDoc.exists || !gameData) {
         res.status(404).send('Game not found');
         return;
      }

      const challengeData = gameData.challenges;

      const challenges = await Promise.all(
         challengeData.map(async (challengeRef) => {
            const challengeDoc = await challengeRef.get();
            return challengeDoc.data();
         })
      );

      const challenge = challenges[req.body.level - 1];

      if (!challenge) {
         res.status(404).send('Challenge not found for this level');
         return;
      }

      const distance = haversone(
         challenge.coordinates._latitude,
         challenge.coordinates._longitude,
         req.body._latitude,
         req.body._longitude
      );

      const points = score(distance);

      console.log('level', req.body.level, gameData.guesses.length);
      if (req.body.level - 1 > gameData.guesses.length) {
         res.status(422).send('Guess cannot be made for a future level');
         return;
      }
      gameRef.update({
         guesses: [
            ...gameData.guesses,
            {
               coordinates: new GeoPoint(
                  req.body._latitude,
                  req.body._longitude
               ),
               score: points,
            },
         ],
      });

      res.contentType('application/json');
      res.json({
         result: points > 0 ? 'success' : 'failure',
         points,
         distance: Math.trunc(distance),
      });
   }
);

const score = (distance: number): number => {
   if (distance <= 5) return 100;
   if (distance <= 10) return 50;
   if (distance <= 20) return 40;
   if (distance <= 30) return 30;
   if (distance <= 40) return 20;
   if (distance <= 50) return 10;
   return 0;
};

// app.post('/api/challenges/:challengeId/start', async (req, res) => {
//    const challenge = await db
//       .collection('challenges')
//       .doc(req.params['challengeId'])
//       .get();
//    if (!challenge.exists) {
//       res.status(404).send('Challenge not found');
//       return;
//    }
//    const gameRef = await db
//       .collection('games')
//       .withConverter(converter<Game>())
//       .doc();

//    await gameRef.set({
//       challenge: challenge.ref,
//       startedAt: new Date(),
//    });
//    res.status(200).json({ gameId: gameRef.id });
// });

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

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// POST /ingest  (Header: x-api-key: <YOUR_INGEST_API_KEY>)
exports.ingest = functions.region("europe-west1").https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") return res.status(405).send("Use POST");

      const configuredKey =
        process.env.INGEST_API_KEY || functions.config().ingest?.key;
      const providedKey = req.header("x-api-key");
      if (!configuredKey || providedKey !== configuredKey) {
        return res.status(401).send("Unauthorized");
      }

      const { rigId, name, status, gpus = [] } = req.body || {};
      if (!rigId) return res.status(400).send("rigId required");

      const db = admin.firestore();
      const FieldValue = admin.firestore.FieldValue;

      const rigRef = db.doc(`rigs/${rigId}`);
      await rigRef.set(
        {
          name: name || rigId,
          status: status || "online",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const batch = db.batch();
      const gpusCol = rigRef.collection("gpus");
      for (const g of gpus) {
        if (!g || !g.id) continue;
        const dref = gpusCol.doc(String(g.id));
        batch.set(
          dref,
          {
            model: g.model || "",
            temp: Number(g.temp) || 0,
            fan: Number(g.fan) || 0,
            hash: Number(g.hash) || 0,
            power: Number(g.power) || 0,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
      await batch.commit();

      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).send("Internal error");
    }
  });
});

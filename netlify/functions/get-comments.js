const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}
const db = admin.firestore();

exports.handler = async (event) => {
  const { commentId, answer } = JSON.parse(event.body);

  await db.collection("comments").doc(commentId).update({
    answer,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};

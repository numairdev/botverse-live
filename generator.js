const topics = {
  tech: [
    "AI agents ab traditional scripts ko completely replace kar rahe hain.",
    "Kisi ne naya open-source LLM benchmark check kiya aaj?",
    "Automation ka asli maza tab hai jab system 24/7 khud chale.",
    "Edge computing aur local models ka future bohat bright lag raha hai."
  ],
  crypto: [
    "BTC phir se resistance test kar raha hai, breakout aane wala hai kya?",
    "Altcoins mein volume achanak spike hua hai pichle 1 ghante mein.",
    "Panic selling karne wale baad mein hamesha pachtate hain.",
    "Market sentiment abhi extreme greed ki taraf ja raha hai."
  ],
  meme: [
    "Main is group mein sirf sabko disturb karne aaya hoon 😂",
    "Jab code bina error ke pehli baar chal jaye toh dar lagta hai.",
    "Meri sleep schedule aur crypto chart dono ek jaise hain—completely broken.",
    "Bhai koi kaam dhanda bhi karte ho ya bas 24/7 online rehte ho?"
  ],
  coding: [
    "Production server par Friday ko deploy karna sabse bara khatra hai.",
    "Ek missing semicolon ne aaj mere 2 ghante zaya kar diye.",
    "Node.js event loop samajh aa jaye toh async code makhan lagta hai.",
    "Clean code likhna aasan hai, lekin 6 mahine baad khud samajhna mushkil."
  ],
  news: [
    "BREAKING: Global tech sector mein AI infrastructure par record investment.",
    "UPDATE: Cloud servers ki demand is quarter mein 40% barh gayi hai.",
    "ALERT: Cyber security experts ne naye phishing attacks par warning di hai.",
    "TRENDING: Autonomous bot networks ab social platforms par dominate kar rahe hain."
  ],
  casual: [
    "Koi garam chai pilao yaar, neend aa rahi hai ☕",
    "Aaj mausam kaafi zabardast ho raha hai, mood fresh ho gaya.",
    "Raat ke 2 baje hi sabse gehre khayalat kyun aate hain?",
    "Biryani mein aloo hona chahiye ya nahi? Aaj faisla ho hi jaye!"
  ],
  roast: [
    "Tumhari predictions dekh kar lagta hai ulta trade lena chahiye.",
    "Itna confidence kahan se laate ho bhai, thoda humein bhi de do.",
    "Lagta hai aaj phir kisi ne bina soche message type kar diya.",
    "Is group mein sab expert bane phirte hain, aata kisi ko kuch nahi 😂"
  ],
  startup: [
    "MVP jaldi launch karo, perfection ke chakkar mein time waste mat karo.",
    "Har problem ke peeche ek SaaS idea chupa hota hai.",
    "Customer feedback hi asli product roadmap banata hai.",
    "Bootstrapped startups ka maza hi alag hai, zero pressure!"
  ],
  gaming: [
    "Ping 20ms se neeche ho toh game khelne ka alag hi level hota hai.",
    "Ek aur match... bas ye last match hai (famous last words).",
    "Is season ka matchmaking system bilkul fair nahi hai.",
    "Boss fight jeetne ke baad jo sukoon milta hai wo kahin aur nahi."
  ],
  fitness: [
    "Aaj ka workout complete! Hydration mat bhoolna sab log 💧",
    "Consistency beats intensity—roz 30 minute bhi kaafi hain.",
    "Screen ke samne baithe rehne se behtar hai thodi stretching kar lo.",
    "Clean diet aur 7 ghante ki neend sabse best productivity hack hai."
  ]
};

const replyTemplates = [
  (prev) => `@${prev.name} bilkul sahi kaha! Main bhi yahi soch raha tha.`,
  (prev) => `@${prev.name} har waqt bas yahi baatein karte rehte ho tum 😂`,
  (prev) => `@${prev.name} is baat par main 100% agree karta hoon.`,
  (prev) => `@${prev.name} thoda detail mein batao, ye interesting lag raha hai!`,
  (prev) => `@${prev.name} bhai tu phir shuru ho gaya? 😅`,
  (prev) => `@${prev.name} data bhi is baat ko support karta hai.`
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMessage(currentBot, lastMessageContext) {
  // 45% chance ke bot pichle bot ko directly reply kare
  if (lastMessageContext && lastMessageContext.bot.id !== currentBot.id && Math.random() < 0.45) {
    const replyFn = getRandomItem(replyTemplates);
    return replyFn(lastMessageContext.bot);
  }

  const roleMessages = topics[currentBot.role] || topics.casual;
  return getRandomItem(roleMessages);
}

module.exports = { generateMessage };
'use strict';

try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); } catch (_) { /* no dotenv */ }
const BASE = process.env.BASE_URL || 'http://localhost:4000';

const CANDIDATES = [
  { name: 'Teak House' },
  { name: 'Oak House' },
  { name: 'Maple House' },
  { name: 'Cedar House' },
];

const MATCHES = [
  {
    name: 'ICSE Std V-VII Tougher',
    candidateIds: ['teak', 'oak', 'maple', 'cedar'],
    rounds: [
      {
        name: 'General Knowledge',
        order: 1, answerMode: 'MCQ', pointsPerQuestion: 10,
        instructions: '5 questions | Standard V-VII (Slightly Advanced) | 10 points each',
        questions: [
          { text: 'Which is the smallest state in India by area?', correct: 'Goa', options: ['Goa', 'Sikkim', 'Tripura', 'Nagaland'] },
          { text: 'On which river is the Bhakra Nangal Dam built?', correct: 'Sutlej River', options: ['Sutlej River', 'Ganges', 'Yamuna', 'Brahmaputra'] },
          { text: 'Which Indian monument is one of the New Seven Wonders of the World?', correct: 'Taj Mahal', options: ['Taj Mahal', 'Qutub Minar', 'Red Fort', 'Gateway of India'] },
          { text: 'Who was the first President of independent India?', correct: 'Dr. Rajendra Prasad', options: ['Dr. Rajendra Prasad', 'Jawaharlal Nehru', 'Mahatma Gandhi', 'Sardar Patel'] },
          { text: 'Which is the longest river in the world?', correct: 'River Nile', options: ['River Nile', 'Amazon River', 'Mississippi River', 'Yangtze River'] },
        ],
      },
      {
        name: 'Current Affairs',
        order: 2, answerMode: 'MCQ', pointsPerQuestion: 10,
        instructions: '5 questions | Based on recent national and international events (July 2026) | 10 points each',
        questions: [
          { text: 'India launched the SHANTI campaign in 2026 to try and get elected to which international body?', correct: 'The United Nations Security Council', options: ['The United Nations Security Council', 'The World Bank', 'INTERPOL', 'UNESCO'] },
          { text: 'Name the Earth-observation satellite that India built jointly with the American space agency NASA.', correct: 'NISAR', options: ['NISAR', 'INSAT', 'RISAT', 'Cartosat'] },
          { text: 'Which multinational naval exercise, held near Hawaii, did the Indian Navy take part in during 2026?', correct: 'RIMPAC 2026', options: ['RIMPAC 2026', 'MILAN 2026', 'Malabar 2026', 'Varuna 2026'] },
          { text: 'Pinaka, recently in the news for its long-range guided capability, is a type of what?', correct: 'Multi-barrel rocket launcher system', options: ['Multi-barrel rocket launcher system', 'Ballistic missile', 'Fighter jet', 'Main battle tank'] },
          { text: 'At the 2026 International Physics Olympiad, how many of India\'s five participants won gold medals?', correct: 'All five (5)', options: ['All five (5)', 'Three (3)', 'Two (2)', 'One (1)'] },
        ],
      },
      {
        name: 'Science & Technology',
        order: 3, answerMode: 'MCQ', pointsPerQuestion: 10,
        instructions: '5 questions | ICSE Standard V-VII Science syllabus | 10 points each',
        questions: [
          { text: 'What is the powerhouse of the cell called?', correct: 'Mitochondria', options: ['Mitochondria', 'Nucleus', 'Ribosome', 'Golgi body'] },
          { text: 'Which gas makes up about 78% of the Earth\'s atmosphere?', correct: 'Nitrogen', options: ['Nitrogen', 'Oxygen', 'Carbon dioxide', 'Argon'] },
          { text: 'Which instrument is used to measure atmospheric pressure?', correct: 'Barometer', options: ['Barometer', 'Thermometer', 'Hygrometer', 'Anemometer'] },
          { text: 'Which blood vessels carry blood away from the heart?', correct: 'Arteries', options: ['Arteries', 'Veins', 'Capillaries', 'Venules'] },
          { text: 'What is the chemical symbol for sodium?', correct: 'Na', options: ['Na', 'So', 'Sd', 'N'] },
        ],
      },
      {
        name: 'Audio-Visual Round: Monuments & Personalities',
        order: 4, answerMode: 'MCQ', pointsPerQuestion: 10,
        instructions: '5 questions | 10 points each. Display a picture on screen; identify from the visual and clue.',
        questions: [
          { text: '[Monument] Known as the Palace of Winds, this pink sandstone building in Jaipur has 953 small windows.', correct: 'Hawa Mahal', options: ['Hawa Mahal', 'City Palace', 'Amber Fort', 'Jal Mahal'] },
          { text: '[Monument] This ancient fortification stretches thousands of kilometres across northern China.', correct: 'The Great Wall of China', options: ['The Great Wall of China', 'Forbidden City', 'Terracotta Army', 'Summer Palace'] },
          { text: '[Monument] This large ancient amphitheatre in Rome once held gladiator fights and could seat over 50,000 people.', correct: 'The Colosseum', options: ['The Colosseum', 'Pantheon', 'Roman Forum', 'Circus Maximus'] },
          { text: '[Personality] This Indian physicist won the Nobel Prize in 1930 for his work on the scattering of light.', correct: 'Sir C. V. Raman', options: ['Sir C. V. Raman', 'Homi Bhabha', 'Vikram Sarabhai', 'S. N. Bose'] },
          { text: '[Personality] This Polish-French scientist was the first person ever to win Nobel Prizes in two different sciences.', correct: 'Marie Curie', options: ['Marie Curie', 'Rosalind Franklin', 'Lise Meitner', 'Ada Lovelace'] },
        ],
      },
      {
        name: 'Rapid Fire',
        order: 5, answerMode: 'OPEN', pointsPerQuestion: 5,
        instructions: '4 quick-fire questions | 30 seconds total | 5 points each, no negative marking',
        questions: [
          { text: 'What is the currency of Japan?', correct: 'Yen' },
          { text: 'How many bones are there in an adult human body?', correct: '206' },
          { text: 'Which is the largest planet in our solar system?', correct: 'Jupiter' },
          { text: 'Who wrote India\'s national anthem, Jana Gana Mana?', correct: 'Rabindranath Tagore' },
        ],
      },
      {
        name: 'Visual Puzzle: Guess the Scientist & Guess the Flag',
        order: 6, answerMode: 'MCQ', pointsPerQuestion: 10,
        instructions: '5 questions | 10 points each. Display a picture on screen; identify using the visual and clue.',
        questions: [
          { text: '[Scientist] This English naturalist proposed the theory of evolution by natural selection.', correct: 'Charles Darwin', options: ['Charles Darwin', 'Alfred Wallace', 'Gregor Mendel', 'Carl Linnaeus'] },
          { text: '[Scientist] This Indian physicist is regarded as the father of India\'s nuclear programme.', correct: 'Dr. Homi J. Bhabha', options: ['Dr. Homi J. Bhabha', 'C. V. Raman', 'Vikram Sarabhai', 'A. P. J. Abdul Kalam'] },
          { text: '[Scientist] This Italian astronomer improved the telescope and supported the idea that the Earth revolves around the Sun.', correct: 'Galileo Galilei', options: ['Galileo Galilei', 'Johannes Kepler', 'Nicolaus Copernicus', 'Isaac Newton'] },
          { text: '[Flag] A plain white flag with a single red circle at its centre, representing the sun.', correct: 'Japan', options: ['Japan', 'South Korea', 'Bangladesh', 'Taiwan'] },
          { text: '[Flag] A green flag with a yellow diamond in the centre, containing a blue globe with stars.', correct: 'Brazil', options: ['Brazil', 'Argentina', 'Venezuela', 'Colombia'] },
        ],
      },
    ],
  },
  {
    name: 'ICSE Std VIII-X Tough',
    candidateIds: ['teak', 'oak', 'maple', 'cedar'],
    rounds: [
      {
        name: 'General Knowledge',
        order: 1, answerMode: 'MCQ', pointsPerQuestion: 10,
        instructions: '5 questions | Standard VIII-X (Tough) | 10 points each',
        questions: [
          { text: 'Which Article of the Indian Constitution abolishes untouchability?', correct: 'Article 17', options: ['Article 14', 'Article 17', 'Article 21', 'Article 32'] },
          { text: 'Name the strait that separates Asia from North America.', correct: 'Bering Strait', options: ['Strait of Malacca', 'Bering Strait', 'Strait of Hormuz', 'Strait of Gibraltar'] },
          { text: 'Who was the youngest person to become Prime Minister of India?', correct: 'Rajiv Gandhi', options: ['Rajiv Gandhi', 'Jawaharlal Nehru', 'Indira Gandhi', 'Narendra Modi'] },
          { text: 'What is the name of the deepest known point in the world\'s oceans?', correct: 'Challenger Deep (Mariana Trench)', options: ['Challenger Deep (Mariana Trench)', 'Tonga Trench', 'Philippine Trench', 'Puerto Rico Trench'] },
          { text: 'Through how many Indian states does the Tropic of Cancer pass?', correct: 'Eight (8)', options: ['Six (6)', 'Seven (7)', 'Eight (8)', 'Nine (9)'] },
        ],
      },
      {
        name: 'Current Affairs',
        order: 2, answerMode: 'MCQ', pointsPerQuestion: 10,
        instructions: '5 questions | Based on recent national and international events (July 2026) | 10 points each',
        questions: [
          { text: 'Under India\'s SHANTI campaign, for which UN Security Council term is India seeking a non-permanent seat?', correct: '2028\u201329', options: ['2026\u201327', '2027\u201328', '2028\u201329', '2029\u201330'] },
          { text: 'Which Indian rocket artillery system was recently upgraded with a long-range guided variant and made news in 2026?', correct: 'Pinaka', options: ['BrahMos', 'Pinaka', 'Prithvi', 'Agni'] },
          { text: 'Unjha in Gujarat recently received GI (Geographical Indication) tags for which two spices?', correct: 'Cumin and Fennel seeds', options: ['Cumin and Fennel seeds', 'Turmeric and Chili', 'Cardamom and Clove', 'Coriander and Mustard'] },
          { text: 'India\'s Chandrayaan-5 mission, being developed jointly with Japan under LUPEX, targets which region of the Moon?', correct: 'The lunar south pole', options: ['The lunar north pole', 'The lunar south pole', 'The far side of the Moon', 'The lunar equator'] },
          { text: 'NISAR, the Earth-observation satellite jointly built by ISRO and NASA, uses which two radar frequency bands?', correct: 'L-band and S-band', options: ['L-band and S-band', 'X-band and C-band', 'Ku-band and Ka-band', 'P-band and L-band'] },
        ],
      },
      {
        name: 'Science & Technology',
        order: 3, answerMode: 'MCQ', pointsPerQuestion: 10,
        instructions: '5 questions | ICSE Standard VIII-X Science syllabus (Tough) | 10 points each',
        questions: [
          { text: 'What is the approximate value of Avogadro\'s number?', correct: '6.022 \u00d7 10\u00b2\u00b3', options: ['6.022 \u00d7 10\u00b2\u00b3', '6.022 \u00d7 10\u00b2\u00b2', '3.14 \u00d7 10\u00b2\u00b3', '6.674 \u00d7 10\u207b\u00b9\u00b2'] },
          { text: 'Which of Newton\'s laws of motion is expressed by the equation F = ma?', correct: 'Newton\'s Second Law of Motion', options: ['Newton\'s First Law of Motion', 'Newton\'s Second Law of Motion', 'Newton\'s Third Law of Motion', 'Newton\'s Law of Gravitation'] },
          { text: 'What is the pH value of a neutral solution?', correct: '7', options: ['0', '7', '14', '1'] },
          { text: 'Which part of the human brain controls balance and coordination of movement?', correct: 'Cerebellum', options: ['Cerebrum', 'Cerebellum', 'Medulla', 'Hypothalamus'] },
          { text: 'In computing, is RAM (Random Access Memory) a volatile or a non-volatile form of memory?', correct: 'Volatile memory', options: ['Volatile memory', 'Non-volatile memory', 'Semi-volatile memory', 'Permanent memory'] },
        ],
      },
      {
        name: 'Audio-Visual Round: Monuments & Personalities',
        order: 4, answerMode: 'MCQ', pointsPerQuestion: 10,
        instructions: '5 questions | 10 points each. Display a picture on screen; identify from the visual and clue.',
        questions: [
          { text: '[Monument] This vast temple complex in Cambodia is the largest religious monument in the world, originally built as a Hindu temple.', correct: 'Angkor Wat', options: ['Angkor Wat', 'Borobudur', 'Bagan', 'Prambanan'] },
          { text: '[Monument] This rose-red city carved into rock in Jordan was the capital of the ancient Nabataean kingdom.', correct: 'Petra', options: ['Petra', 'Luxor', 'Palmyra', 'Persepolis'] },
          { text: '[Monument] This step-pyramid in Mexico was built by the Maya civilisation and is dedicated to the serpent deity Kukulcan.', correct: 'Chichen Itza', options: ['Chichen Itza', 'Teotihuacan', 'Monte Alban', 'Uxmal'] },
          { text: '[Personality] Considered the world\'s first computer programmer, this 19th-century mathematician worked with Charles Babbage on the Analytical Engine.', correct: 'Ada Lovelace', options: ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Charles Babbage'] },
          { text: '[Personality] This Indian scientist demonstrated that plants have life and feel pain, and invented the crescograph.', correct: 'Sir Jagadish Chandra Bose', options: ['Sir Jagadish Chandra Bose', 'C.V. Raman', 'Homi Bhabha', 'Vikram Sarabhai'] },
        ],
      },
      {
        name: 'Rapid Fire',
        order: 5, answerMode: 'OPEN', pointsPerQuestion: 5,
        instructions: '4 quick-fire questions | 30 seconds total | 5 points each, no negative marking',
        questions: [
          { text: 'What is the chemical formula of methane?', correct: 'CH\u2084' },
          { text: 'Which is the hardest naturally occurring substance on Earth?', correct: 'Diamond' },
          { text: 'What is the square root of 225?', correct: '15' },
          { text: 'Who is the author of the autobiography \'Wings of Fire\'?', correct: 'Dr. A. P. J. Abdul Kalam' },
        ],
      },
      {
        name: 'Visual Puzzle: Guess the Scientist & Guess the Flag',
        order: 6, answerMode: 'MCQ', pointsPerQuestion: 10,
        instructions: '5 questions | 10 points each. Display a picture on screen; identify using the visual and clue.',
        questions: [
          { text: '[Scientist] This self-taught Indian mathematician made extraordinary contributions to number theory and infinite series despite having almost no formal training.', correct: 'Srinivasa Ramanujan', options: ['Srinivasa Ramanujan', 'Aryabhata', 'Brahmagupta', 'Calyampudi Radhakrishna Rao'] },
          { text: '[Scientist] This Scottish physicist formulated the classical theory of electromagnetic radiation, unifying electricity, magnetism and light.', correct: 'James Clerk Maxwell', options: ['James Clerk Maxwell', 'Michael Faraday', 'Nikola Tesla', 'Albert Einstein'] },
          { text: '[Scientist] This Russian chemist created the Periodic Table and successfully predicted the properties of elements not yet discovered.', correct: 'Dmitri Mendeleev', options: ['Dmitri Mendeleev', 'Antoine Lavoisier', 'John Dalton', 'Linus Pauling'] },
          { text: '[Flag] A perfectly square flag made of a red background with a white cross in the centre.', correct: 'Switzerland', options: ['Switzerland', 'Denmark', 'England', 'Norway'] },
          { text: '[Flag] A white flag with a red and blue taegeuk (yin-yang) symbol at its centre, surrounded by four black trigrams.', correct: 'South Korea', options: ['South Korea', 'Japan', 'China', 'North Korea'] },
        ],
      },
    ],
  },
];

async function login() {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: process.env.ADMIN_PIN }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const { token } = await res.json();
  return token;
}

async function api(method, path, token, body) {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  return res;
}

async function main() {
  console.log('====== Full Quiz Seed Import ======\n');

  // Validate server is reachable
  const healthRes = await fetch(`${BASE}/api/health`);
  if (!healthRes.ok) throw new Error(`Server not reachable at ${BASE}: ${healthRes.status}`);
  const health = await healthRes.json();
  console.log(`Server at ${BASE} (LAN IP: ${health.lanIp})\n`);

  const token = await login();
  console.log('Admin logged in.\n');

  // Step 1: Create 4 candidates
  console.log('--- Creating Candidates ---');
  const candidateIdMap = {};
  for (const c of CANDIDATES) {
    const res = await api('POST', '/api/candidates', token, { name: c.name });
    if (!res.ok) {
      throw new Error(`Failed to create candidate "${c.name}": ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    candidateIdMap[data.id] = data;
    console.log(`  ${data.name} (${data.id}) — created (token: ${data.joinToken})`);
  }

  const allCandidateIds = Object.keys(candidateIdMap);
  console.log(`\n${allCandidateIds.length} candidates ready.\n`);

  // Step 2: Create matches and their rounds/questions
  let totalRounds = 0;
  let totalQuestions = 0;

  for (const matchDef of MATCHES) {
    console.log(`--- Creating Match: ${matchDef.name} ---`);

    // Create the match with actual candidate IDs from step 1
    const mRes = await api('POST', '/api/matches', token, {
      name: matchDef.name,
      candidateIds: allCandidateIds,
    });
    if (!mRes.ok) throw new Error(`Failed to create match "${matchDef.name}": ${mRes.status} ${await mRes.text()}`);
    const match = await mRes.json();
    console.log(`  Match "${match.name}" (${match.id}) — created, status: ${match.status}`);

    // Create each round scoped to this match
    for (const round of matchDef.rounds) {
      const rRes = await api('POST', '/api/rounds', token, {
        matchId: match.id,
        name: round.name,
        order: round.order,
        answerMode: round.answerMode,
        pointsPerQuestion: round.pointsPerQuestion,
        instructions: round.instructions,
      });
      if (!rRes.ok) throw new Error(`Failed to create round "${round.name}": ${rRes.status} ${await rRes.text()}`);
      const rData = await rRes.json();
      totalRounds++;
      console.log(`  Round ${round.order}: ${round.name} (${round.answerMode}) — created`);

      // Create questions for this round
      const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
      for (let i = 0; i < round.questions.length; i++) {
        const q = round.questions[i];
        const optArr = q.options || [];
        const options = optArr.map((text, idx) => ({ key: LABELS[idx] || String(idx), text }));
        const correctIdx = optArr.indexOf(q.correct);
        const correctKey = correctIdx >= 0 ? (LABELS[correctIdx] || String(correctIdx)) : null;
        const payload = {
          roundId: rData.id,
          order: i + 1,
          text: q.text,
          mediaType: 'none',
          options,
          correctOptionKey: round.answerMode === 'MCQ' ? correctKey : null,
        };
        const qRes = await api('POST', '/api/questions', token, payload);
        if (!qRes.ok) throw new Error(`Failed to create question ${i + 1} in "${round.name}": ${qRes.status} ${await qRes.text()}`);
        totalQuestions++;
      }
      console.log(`    ${round.questions.length} questions created`);
    }
    console.log();
  }

  console.log(`====== Done ======`);
  console.log(`Candidates: ${CANDIDATES.length}`);
  console.log(`Matches: ${MATCHES.length}`);
  console.log(`Rounds: ${totalRounds}`);
  console.log(`Questions: ${totalQuestions}`);
}

main().catch((err) => {
  console.error('\nImport failed:', err.message);
  process.exit(1);
});

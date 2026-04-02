import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMyCourses, checkCourseAccess, fetchCourseProgress, saveCourseProgress } from "../api/auth";
import "../styles/lessons.css";

const VIDEO_REQUIRED_SECONDS = 20;

const STORY_LIBRARY = {
  mastery: [
    {
      id: "market-morning",
      title: "ናይ ገበያ ንግሆ",
      summary: "A child visits the market early in the morning and helps choose fruit for the family.",
      image: "/img/story-lessons/market-morning.svg",
      paragraphs: [
        { ti: "ንግሆ ኣደይ ምሳይ ናብ ገበያ ወሰደትኒ።", en: "In the morning, my mother took me to the market with her." },
        { ti: "ኣብኡ ኮሚደረን ሙዝን ረኣና እሞ እቲ ዝሓሸ መረጽና።", en: "There we saw tomatoes and bananas, and we chose the best ones." },
        { ti: "ድሕሪኡ ናብ ገዛ ተመሊስና ምግቢ ንስድራ ኣዳለና።", en: "After that, we returned home and prepared food for the family." }
      ],
      vocabulary: [
        { ti: "ገበያ", en: "market" },
        { ti: "መረጽና", en: "we chose" },
        { ti: "ኣዳለና", en: "we prepared" }
      ],
      prompts: [
        "Who went to the market?",
        "What food did they choose?",
        "Tell the ending in your own words."
      ]
    },
    {
      id: "family-evening",
      title: "ናይ ስድራ ምሸት",
      summary: "A family gathers in the evening to share tea, conversation, and a short story.",
      image: "/img/story-lessons/family-evening.svg",
      paragraphs: [
        { ti: "ምሸት ኩሉ ስድራ ኣብ ሳሎን ተኣከበ።", en: "In the evening, the whole family gathered in the living room." },
        { ti: "ኣቦይ ሻሂ ኣፍልሰ እሞ ኣደይ ንእሽቶ ዛንታ ጀመረት።", en: "My father poured tea, and my mother began a short story." },
        { ti: "ኣብ መወዳእታ ሓወይ እታ ዛንታ ብቃሉ ደገማ።", en: "At the end, my brother retold the story in his own words." }
      ],
      vocabulary: [
        { ti: "ተኣከበ", en: "gathered" },
        { ti: "ኣፍልሰ", en: "poured" },
        { ti: "ደገማ", en: "retold" }
      ],
      prompts: [
        "Where did the family meet?",
        "Who started the story?",
        "Who retold the story at the end?"
      ]
    }
  ],
  reading: [
    {
      id: "school-day-library",
      title: "ናይ ንባብ መዓልቲ",
      summary: "Two classmates read together and then continue their reading at home.",
      image: "/img/story-lessons/reading-day.svg",
      paragraphs: [
        { ti: "ኣብ ክፍሊ ሓደ መጽሓፍ ኣንቢብና ቃላት ሓደሽቲ ተማሃርና።", en: "In class we read a book and learned new words." },
        { ti: "መምህርና ነፍሲ ወከፍ ሓረግ ብቀሊሉ ንኸንብብ ሓገዘና።", en: "Our teacher helped us read each sentence clearly." },
        { ti: "ድሕሪ ትምህርቲ እቲ ታሪኽ ኣብ ገዛ ንደግሞ ኣንበብና።", en: "After school, we read the story again at home." }
      ],
      vocabulary: [
        { ti: "መጽሓፍ", en: "book" },
        { ti: "ሓረግ", en: "sentence" },
        { ti: "ሓገዘና", en: "helped us" }
      ],
      prompts: [
        "What did they read in class?",
        "Who helped them?",
        "What did they do after school?"
      ]
    },
    {
      id: "sara-school-library",
      title: "ሳራ ናብ ቤት ትምህርቲ",
      summary: "Sara leaves home, studies with friends, and shares what she learned later in the day.",
      image: "/img/story-lessons/sara-school.svg",
      paragraphs: [
        { ti: "ሳራ ንግሆ ቦርሳኣ ሒዛ ናብ ቤት ትምህርቲ ተበገሰት።", en: "Sara took her bag in the morning and set off for school." },
        { ti: "ኣብ ክፍሊ ምስ መሓዛታ ታሪኽ ኣንቢባ ሓደሽቲ ቃላት ተማሃረት።", en: "In class she read a story with her friends and learned new words." },
        { ti: "ምሸት ናብ ገዛ ምስ ተመለሰት ነቲ ዝተማህረቶ ንእሽቶ ሓዋ ነገረቶ።", en: "In the evening, when she returned home, she told her younger brother what she had learned." }
      ],
      vocabulary: [
        { ti: "ቦርሳ", en: "bag" },
        { ti: "ሓደሽቲ", en: "new" },
        { ti: "ነገረቶ", en: "she told him" }
      ],
      prompts: [
        "What did Sara carry?",
        "What did she learn at school?",
        "Who listened to her at home?"
      ]
    }
  ]
};

const courseLessons = {
  basic: {
    title: "Basic Tigrinya",
    description: "Learn the fundamentals of Tigrinya alphabet",
    color: "linear-gradient(135deg, #6dd5fa, #2980b9)",
    lessons: [
      { id: 1, title: "Introduction to Tigrinya", type: "video", duration: "5 min", content: { videoPrompt: "Watch the greeting basics and family words overview." } },
      { id: 2, title: "Learning First Letters", type: "reading", duration: "10 min", content: { lines: [{ ti: "ሀ ሁ ሂ", en: "ha hu hi" }, { ti: "ለ ሉ ሊ", en: "la lu li" }], readingTask: "Read each line aloud 2 times." } },
      { id: 3, title: "Basic Pronunciation", type: "audio", duration: "8 min", content: { phrases: ["ሰላም", "ከመይ ኣለኻ", "የቐንየለይ"] } },
      { id: 4, title: "Simple Words", type: "quiz", duration: "5 min", content: { quizVariants: [{ question: "Which word means thank you?", choices: ["ቤት", "የቐንየለይ", "መኪና"], correct: "የቐንየለይ", hint: "It starts with የ", difficulty: "easy" }, { question: "Which word means house?", choices: ["ቤት", "ሰላም", "የቐንየለይ"], correct: "ቤት", hint: "It starts with ቤ", difficulty: "medium" }, { question: "Which word means hello?", choices: ["መኪና", "ሰላም", "የቐንየለይ"], correct: "ሰላም", hint: "It starts with ሰ", difficulty: "hard" }] } },
      { id: 5, title: "Practice Session", type: "practice", duration: "15 min", content: { practicePrompt: "Write 2 greetings and 1 thank-you phrase in Tigrinya." } }
    ]
  },
  standard: {
    title: "Standard Tigrinya",
    description: "Complete learning with interactive games",
    color: "linear-gradient(135deg, #f093fb, #f5576c)",
    lessons: [
      { id: 1, title: "Basic Review", type: "video", duration: "5 min", content: { videoPrompt: "Review daily conversation and polite responses." } },
      { id: 2, title: "Advanced Letters", type: "reading", duration: "12 min", content: { lines: [{ ti: "ቀ ቁ ቂ", en: "qa qu qi" }, { ti: "ጸ ጹ ጺ", en: "tsa tsu tsi" }], readingTask: "Read and identify each letter sound." } },
      { id: 3, title: "Interactive Games", type: "game", duration: "20 min", content: { gameVariants: [{ question: "Type the Tigrinya word for school", expected: "ቤት ትምህርቲ", difficulty: "easy" }, { question: "Type the Tigrinya word for friend", expected: "ተርን", difficulty: "medium" }, { question: "Type the Tigrinya word for king", expected: "ንጉስ", difficulty: "hard" }] } },
      { id: 4, title: "Writing Practice", type: "practice", duration: "15 min", content: { practicePrompt: "Write 3 family words and 2 places in Tigrinya." } },
      { id: 5, title: "Vocabulary Building", type: "quiz", duration: "10 min", content: { quizVariants: [{ question: "Which word means school?", choices: ["ቤት ትምህርቲ", "መግቢ", "ሓው"], correct: "ቤት ትምህርቲ", hint: "It starts with ቤት", difficulty: "easy" }, { question: "Which word means food?", choices: ["መግቢ", "ንጉስ", "ሰላም"], correct: "መግቢ", hint: "It starts with መ", difficulty: "medium" }, { question: "Which word means brother?", choices: ["ሓው", "ቤት", "መኪና"], correct: "ሓው", hint: "It starts with ሓ", difficulty: "hard" }] } },
      { id: 6, title: "Speaking Practice", type: "audio", duration: "10 min", content: { phrases: ["ኣነ ተማሃሪ እየ", "ኣይተ ደሓን ኣሎ", "ብዙሕ የቐንየለይ"] } }
    ]
  },
  premium: {
    title: "Premium Tigrinya",
    description: "Ultimate learning experience",
    color: "linear-gradient(135deg, #4facfe, #00f2fe)",
    lessons: [
      { id: 1, title: "Full Course Access", type: "video", duration: "30 min", content: { videoPrompt: "Watch advanced storytelling and sentence structure session." } },
      { id: 2, title: "All Letter Forms", type: "reading", duration: "20 min", content: { lines: [{ ti: "ከ ኩ ኪ ካ ኬ ክ ኮ", en: "ka series" }, { ti: "ገ ጉ ጊ ጋ ጌ ግ ጎ", en: "ga series" }], readingTask: "Read both full letter families clearly." } },
      { id: 3, title: "Advanced Games", type: "game", duration: "25 min", content: { gameVariants: [{ question: "Type the Tigrinya phrase for Good morning", expected: "እንቋዕ ንግሆ", difficulty: "easy" }, { question: "Type the phrase for My name is...", expected: "ኣነ ስመይ", difficulty: "medium" }, { question: "Type the phrase for Thank you very much", expected: "ብዙሕ የቐንየለይ", difficulty: "hard" }] } },
      { id: 4, title: "Expert Writing", type: "practice", duration: "20 min", content: { practicePrompt: "Write a 2-line self-introduction in Tigrinya." } },
      { id: 5, title: "Video Lessons", type: "video", duration: "45 min", content: { videoPrompt: "Watch conversation between student and teacher." } },
      { id: 6, title: "1-on-1 Tutoring Session", type: "audio", duration: "30 min", content: { phrases: ["ኣነ ስመይ ...", "ኣነ ካብ ... እየ", "እቲ ትምህርቲ ደስ ይብለኒ"] } },
      { id: 7, title: "Certificate Assessment", type: "quiz", duration: "15 min", content: { quizVariants: [{ question: "Choose the correct phrase for 'My name is ...'", choices: ["ኣነ ስመይ ...", "እዚ መጽሓፍ እዩ", "እኔ እየ"], correct: "ኣነ ስመይ ...", hint: "Starts with ኣነ", difficulty: "easy" }, { question: "Choose the phrase for Good morning", choices: ["እንቋዕ ንግሆ", "ርካሽ እንበል", "ቤት ትምህርቲ"], correct: "እንቋዕ ንግሆ", hint: "Starts with እ", difficulty: "medium" }, { question: "Choose the phrase for Thank you very much", choices: ["ብዙሕ የቐንየለይ", "ኣነ ተማሃሪ", "ንጉስ"], correct: "ብዙሕ የቐንየለይ", hint: "Starts with ብ", difficulty: "hard" }] } }
    ]
  },
  family: {
    title: "Family Conversation Pack",
    description: "Everyday home and family conversation practice",
    color: "linear-gradient(135deg, #ffb385, #f06b8b)",
    lessons: [
      { id: 1, title: "Family Greetings", type: "audio", duration: "8 min", content: { phrases: ["እንቋዕ ደሓን መጻእኩም", "ኣደ", "ኣቦ"] } },
      { id: 2, title: "Home Routines", type: "reading", duration: "10 min", content: { lines: [{ ti: "ምግቢ ንብላዕ", en: "Let's eat" }, { ti: "ናብ ቤት ትምህርቲ ንኸይድ", en: "Let's go to school" }], readingTask: "Read each sentence slowly and clearly." } },
      { id: 3, title: "Family Role Play", type: "game", duration: "12 min", content: { gameVariants: [{ question: "Type the Tigrinya word for mother", expected: "ኣደ", difficulty: "easy" }, { question: "Type the Tigrinya word for father", expected: "ኣቦ", difficulty: "medium" }, { question: "Type the Tigrinya phrase for good night", expected: "ምሸት ደሓን", difficulty: "hard" }] } },
      { id: 4, title: "Daily Dialogue Quiz", type: "quiz", duration: "8 min", content: { quizVariants: [{ question: "Which word means mother?", choices: ["ኣቦ", "ኣደ", "ሓው"], correct: "ኣደ", hint: "Starts with ኣ", difficulty: "easy" }, { question: "Which word means father?", choices: ["ኣቦ", "ሓፍቲ", "የቐንየለይ"], correct: "ኣቦ", hint: "Starts with ኣ", difficulty: "medium" }, { question: "Which phrase means good night?", choices: ["ምሸት ደሓን", "ሰላም", "ቤት"], correct: "ምሸት ደሓን", hint: "Starts with ም", difficulty: "hard" }] } }
    ]
  },
  mastery: {
    title: "Storytelling Mastery",
    description: "Narrative flow, expression, and fluent speaking",
    color: "linear-gradient(135deg, #7f7fd5, #51a7f9)",
    lessons: [
      { id: 1, title: "Story Structure", type: "video", duration: "12 min", content: { videoPrompt: "Review beginning-middle-end storytelling patterns." } },
      { id: 2, title: "Narrative Connectors", type: "reading", duration: "10 min", content: { lines: [{ ti: "መጀመርታ", en: "first" }, { ti: "ድሕሪኡ", en: "after that" }, { ti: "ኣብ መወዳእታ", en: "at the end" }], readingTask: "Read the story, then notice how the connector words guide the plot.", story: { title: "ሓንቲ ንእሽቶ ዛንታ ናይ ተማሃሪ", summary: "A simple school-day story using beginning, middle, and ending connectors.", image: "/img/story-lessons/sara-school.svg", paragraphs: [{ ti: "መጀመርታ ሳራ ንግሆ ካብ ቤታ ተበጊሳ ናብ ቤት ትምህርቲ ከደት።", en: "First, Sara left her home in the morning and went to school." }, { ti: "ድሕሪኡ ምስ መሓዛታ ብትግርኛ ተዛሪባ ኣብ ክፍሊ ታሪኽ ኣንበበት።", en: "After that, she spoke in Tigrinya with her friends and read a story in class." }, { ti: "ኣብ መወዳእታ ሳራ ናብ ቤታ ተመሊሳ ነቲ ዛንታ ንእሽቶ ሓዋ ነገረቶ።", en: "At the end, Sara returned home and told the story to her younger brother." }], vocabulary: [{ ti: "ተበጊሳ", en: "set out" }, { ti: "መሓዛታ", en: "her friends" }, { ti: "ተመሊሳ", en: "returned" }], prompts: ["Who is the main character in the story?", "What happened in the middle of the story?", "Retell the ending using your own Tigrinya words."] }, storyLibrary: STORY_LIBRARY.mastery } },
      { id: 3, title: "Fluency Challenge", type: "practice", duration: "15 min", content: { practicePrompt: "Write a short 4-line story in Tigrinya about your day.", storyStarter: "መጀመርታ ኣነ ንግሆ ተንሲአ ..." } },
      { id: 4, title: "Speech Accuracy Game", type: "game", duration: "12 min", content: { gameVariants: [{ question: "Type the Tigrinya phrase for first", expected: "መጀመርታ", difficulty: "easy" }, { question: "Type the Tigrinya phrase for after that", expected: "ድሕሪኡ", difficulty: "medium" }, { question: "Type the Tigrinya phrase for at the end", expected: "ኣብ መወዳእታ", difficulty: "hard" }] } },
      { id: 5, title: "Mastery Quiz", type: "quiz", duration: "10 min", content: { quizVariants: [{ question: "Which connector means first?", choices: ["መጀመርታ", "ድሕሪኡ", "ምሸት"], correct: "መጀመርታ", hint: "Starts with መ", difficulty: "easy" }, { question: "Which connector means after that?", choices: ["ሰላም", "ድሕሪኡ", "ቤት"], correct: "ድሕሪኡ", hint: "Starts with ድ", difficulty: "medium" }, { question: "Which phrase means at the end?", choices: ["ኣብ መወዳእታ", "ኣነ ተማሃሪ", "ንጉስ"], correct: "ኣብ መወዳእታ", hint: "Starts with ኣብ", difficulty: "hard" }] } }
    ]
  },
  phonics: {
    title: "Phonics & Sound Lab",
    description: "Improve listening and pronunciation with sound-focused practice",
    color: "linear-gradient(135deg, #46b58d, #0b5e73)",
    lessons: [
      { id: 1, title: "Sound Awareness", type: "video", duration: "7 min", content: { videoPrompt: "Watch how similar sounds are formed and repeated." } },
      { id: 2, title: "Pair Sound Reading", type: "reading", duration: "10 min", content: { lines: [{ ti: "ሀ ኀ", en: "ha and kha" }, { ti: "ጸ ፀ", en: "tsa variants" }], readingTask: "Read each pair and notice the sound difference." } },
      { id: 3, title: "Pronunciation Drill", type: "audio", duration: "9 min", content: { phrases: ["ሀለዎ", "ኀይሊ", "ጸሓይ"] } },
      { id: 4, title: "Sound Match", type: "quiz", duration: "8 min", content: { quizVariants: [{ question: "Which word starts with ሀ?", choices: ["ሀለዎ", "ጸሓይ", "ኀይሊ"], correct: "ሀለዎ", hint: "Look for ሀ", difficulty: "easy" }, { question: "Which word includes ጸ?", choices: ["ኀይሊ", "ሀለዎ", "ጸሓይ"], correct: "ጸሓይ", hint: "It starts with ጸ", difficulty: "medium" }, { question: "Which word starts with ኀ?", choices: ["ጸሓይ", "ኀይሊ", "ሀለዎ"], correct: "ኀይሊ", hint: "Look for ኀ", difficulty: "hard" }] } },
      { id: 5, title: "Repeat and Record", type: "practice", duration: "12 min", content: { practicePrompt: "Write 3 words with different starting sounds and read them aloud." } }
    ]
  },
  reading: {
    title: "Reading Club",
    description: "Boost comprehension with short stories and reading checks",
    color: "linear-gradient(135deg, #5e7ce2, #2b3f98)",
    lessons: [
      { id: 1, title: "Warmup Story", type: "video", duration: "6 min", content: { videoPrompt: "Watch a short story and identify key words." } },
      { id: 2, title: "Guided Reading", type: "reading", duration: "12 min", content: { lines: [{ ti: "ኣነ ናብ ቤት ትምህርቲ እኸይድ", en: "I go to school" }, { ti: "መሓዛይ ምሳይ እዩ", en: "My friend is with me" }, { ti: "ኣብ ምሸት ነቲ ዛንታ ንደግሞ ነንብብ", en: "In the evening we read the story again" }], readingTask: "Read the short story and explain the sequence in your own words.", story: { title: "ኣብ ቤት ትምህርቲ ዝተኣተወ መዓልቲ", summary: "A child goes to school, studies with a friend, and rereads the story later at home.", image: "/img/story-lessons/reading-day.svg", paragraphs: [{ ti: "ኣነ ንግሆ ናብ ቤት ትምህርቲ እኸይድ።", en: "I go to school in the morning." }, { ti: "ኣብ ክፍሊ ምስ መሓዛይ ሓጺር ዛንታ ነንብብ።", en: "In class, my friend and I read a short story." }, { ti: "ኣብ ምሸት ኣብ ገዛ ነቲ ዛንታ ንደግሞ ነንብብ።", en: "In the evening at home, we read the story again." }], vocabulary: [{ ti: "ክፍሊ", en: "classroom" }, { ti: "ሓጺር", en: "short" }, { ti: "ንደግሞ", en: "again" }], prompts: ["Where does the story begin?", "Who reads with the speaker?", "What happens in the evening?"] }, storyLibrary: STORY_LIBRARY.reading } },
      { id: 3, title: "Listen and Follow", type: "audio", duration: "8 min", content: { phrases: ["ናብ ቤት ትምህርቲ እኸይድ", "መሓዛይ ምሳይ እዩ", "ኣብ ምሸት ንንብብ"] } },
      { id: 4, title: "Comprehension Quiz", type: "quiz", duration: "10 min", content: { quizVariants: [{ question: "What does 'ቤት ትምህርቲ' mean?", choices: ["Food", "School", "Family"], correct: "School", hint: "It is a place to learn", difficulty: "easy" }, { question: "What does 'መሓዛይ' mean?", choices: ["Friend", "Teacher", "Book"], correct: "Friend", hint: "A person close to you", difficulty: "medium" }, { question: "What does 'ንንብብ' suggest?", choices: ["Eating", "Reading", "Travel"], correct: "Reading", hint: "It is a learning activity", difficulty: "hard" }] } },
      { id: 5, title: "Read Aloud Task", type: "practice", duration: "14 min", content: { practicePrompt: "Write a 3-line mini story and read it aloud twice." } }
    ]
  },
  conversation: {
    title: "Speaking Confidence Bootcamp",
    description: "Real-world speaking drills and scenario practice",
    color: "linear-gradient(135deg, #f39c55, #c74a3b)",
    lessons: [
      { id: 1, title: "Conversation Basics", type: "video", duration: "7 min", content: { videoPrompt: "Watch examples of polite greetings and responses." } },
      { id: 2, title: "Everyday Phrases", type: "reading", duration: "10 min", content: { lines: [{ ti: "ከመይ ኣለኻ?", en: "How are you?" }, { ti: "ደሓን እየ", en: "I am fine" }], readingTask: "Read each phrase naturally like a real conversation." } },
      { id: 3, title: "Speak and Repeat", type: "audio", duration: "10 min", content: { phrases: ["ከመይ ኣለኻ?", "ደሓን እየ", "እንታይ ስምካ?"] } },
      { id: 4, title: "Role Play Game", type: "game", duration: "12 min", content: { gameVariants: [{ question: "Type the phrase for 'How are you?'", expected: "ከመይ ኣለኻ?", difficulty: "easy" }, { question: "Type the phrase for 'I am fine'", expected: "ደሓን እየ", difficulty: "medium" }, { question: "Type the phrase for 'What is your name?'", expected: "እንታይ ስምካ?", difficulty: "hard" }] } },
      { id: 5, title: "Confidence Check", type: "practice", duration: "15 min", content: { practicePrompt: "Write a short 4-line dialogue and practice saying it clearly." } }
    ]
  }
};

const getStars = (score = 0) => {
  if (score >= 90) return 3;
  if (score >= 70) return 2;
  if (score > 0) return 1;
  return 0;
};

const getScoreLabel = (score = 0) => `${Math.round(score)}%`;
const getDifficultyLabel = (difficulty = "easy") =>
  difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

function LessonContent({
  course,
  currentLesson,
  currentLessonIndex,
  totalLessons,
  completedLessons,
  lessonScores,
  lessonSteps,
  onComplete,
  onBack,
  onStepUpdate,
  onNextLesson,
  onPreviousLesson,
}) {
  const savedLessonState = lessonSteps[currentLesson.id] || {};
  const lessonVariants = currentLesson.type === "quiz"
    ? currentLesson.content?.quizVariants
    : currentLesson.type === "game"
      ? currentLesson.content?.gameVariants
      : null;
  const savedVariantIndex = savedLessonState.variantIndex;
  const shouldRefreshVariant = completedLessons.includes(currentLesson.id);
  const hasValidSavedVariant =
    Array.isArray(lessonVariants) &&
    typeof savedVariantIndex === "number" &&
    savedVariantIndex >= 0 &&
    savedVariantIndex < lessonVariants.length;
  const variantIndex = Array.isArray(lessonVariants) && lessonVariants.length > 0
    ? shouldRefreshVariant
      ? hasValidSavedVariant
        ? (savedVariantIndex + 1) % lessonVariants.length
        : 0
      : hasValidSavedVariant
        ? savedVariantIndex
        : 0
    : -1;

  const [interactionDone, setInteractionDone] = useState(Boolean(savedLessonState.interactionDone));
  const [selectedChoice, setSelectedChoice] = useState(savedLessonState.selectedChoice || "");
  const [videoChoice, setVideoChoice] = useState(savedLessonState.videoChoice || "");
  const [videoWatched, setVideoWatched] = useState(Boolean(savedLessonState.videoWatched));
  const [videoTasks, setVideoTasks] = useState(Array.isArray(savedLessonState.videoTasks) ? savedLessonState.videoTasks : []);
  const [videoNote, setVideoNote] = useState(savedLessonState.videoNote || "");
  const [videoWatchSeconds, setVideoWatchSeconds] = useState(Number(savedLessonState.videoWatchSeconds || 0));
  const [videoTimerRunning, setVideoTimerRunning] = useState(Boolean(savedLessonState.videoTimerRunning));
  const [checkpointAttempts, setCheckpointAttempts] = useState(Array.isArray(savedLessonState.checkpointAttempts) ? savedLessonState.checkpointAttempts : []);
  const [videoSourceError, setVideoSourceError] = useState(false);
  const [practiceText, setPracticeText] = useState(savedLessonState.practiceText || "");
  const [gameWord, setGameWord] = useState(savedLessonState.gameWord || "");
  const [listenCount, setListenCount] = useState(savedLessonState.listenCount || 0);
  const [activityScore, setActivityScore] = useState(lessonScores[currentLesson.id] || 0);
  const [hardBonus, setHardBonus] = useState(Boolean(savedLessonState.hardBonus));
  const [selectedLibraryStoryId, setSelectedLibraryStoryId] = useState(currentLesson.content?.storyLibrary?.[0]?.id || null);

  useEffect(() => {
    onStepUpdate(currentLesson.id, {
      interactionDone,
      selectedChoice,
      videoChoice,
      videoWatched,
      videoTasks,
      videoNote,
      videoWatchSeconds,
      videoTimerRunning,
      checkpointAttempts,
      practiceText,
      gameWord,
      listenCount,
      variantIndex,
      hardBonus,
      score: activityScore,
    });
  }, [currentLesson.id, interactionDone, selectedChoice, videoChoice, videoWatched, videoTasks, videoNote, videoWatchSeconds, videoTimerRunning, checkpointAttempts, practiceText, gameWord, listenCount, variantIndex, hardBonus, activityScore, onStepUpdate]);

  useEffect(() => {
    if (currentLesson.type !== "video") {
      return;
    }

    if (!videoTimerRunning || videoWatched) {
      return;
    }

    const timer = setInterval(() => {
      setVideoWatchSeconds((prev) => {
        const next = Math.min(VIDEO_REQUIRED_SECONDS, prev + 1);
        if (next >= VIDEO_REQUIRED_SECONDS) {
          setVideoTimerRunning(false);
          setVideoWatched(true);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentLesson.type, videoTimerRunning, videoWatched]);

  const getIcon = (type) => {
    const icons = { video: "🎬", reading: "📖", audio: "🎧", quiz: "❓", game: "🎮", practice: "✏️" };
    return icons[type] || "📚";
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ti-ER";
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const getVideoLessonDefaults = () => {
    const sharedA = "/video/tigrinya-er/basic-1.mp4";
    const sharedB = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";
    const sharedC = "/video/tigrinya-er/premium-1.mp4";
    const sharedD = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";
    const sharedE = "/video/tigrinya-er/standard-1.mp4";
    const sharedF = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";

    const defaultsByLesson = {
      basic: {
        1: {
          videoUrl: sharedA,
          backupVideoUrl: sharedB,
          coveredTopics: ["Basic greetings", "Family words", "Polite introductions"],
          checkpoint: {
            question: "Which phrase in this lesson means thank you?",
            choices: ["ቤት", "የቐንየለይ", "መኪና"],
            correct: "የቐንየለይ",
            hint: "Look for the gratitude phrase.",
          },
        },
      },
      standard: {
        1: {
          videoUrl: sharedE,
          backupVideoUrl: sharedF,
          coveredTopics: ["Conversation review", "Polite responses", "Daily practice setup"],
          checkpoint: {
            question: "What is this lesson mainly reviewing?",
            choices: ["Daily conversation", "Math drills", "Only writing symbols"],
            correct: "Daily conversation",
            hint: "Focus on speaking use-cases.",
          },
        },
      },
      premium: {
        1: {
          videoUrl: sharedD,
          backupVideoUrl: sharedC,
          coveredTopics: ["Advanced sentence flow", "Story framing", "Speaking confidence"],
          checkpoint: {
            question: "Which skill is emphasized first in this premium video?",
            choices: ["Sentence flow", "Alphabet tracing", "Typing only"],
            correct: "Sentence flow",
            hint: "Think advanced fluency.",
          },
        },
        5: {
          videoUrl: "/video/tigrinya-er/premium-5.mp4",
          backupVideoUrl: sharedB,
          coveredTopics: ["Teacher-student dialogue", "Response timing", "Pronunciation clarity"],
          checkpoint: {
            question: "This lesson video focuses on which interaction?",
            choices: ["Teacher-student conversation", "Only letter shapes", "Payment steps"],
            correct: "Teacher-student conversation",
            hint: "It is a dialogue format.",
          },
        },
      },
      family: {
        1: {
          videoUrl: "/video/tigrinya-er/family-1.mp4",
          backupVideoUrl: sharedF,
          coveredTopics: ["Family greetings", "Home language", "Daily routine phrases"],
          checkpoint: {
            question: "What setting is highlighted in this family lesson?",
            choices: ["Home conversation", "Airport travel", "Sports commentary"],
            correct: "Home conversation",
            hint: "Think family and routine.",
          },
        },
      },
      mastery: {
        1: {
          videoUrl: "/video/tigrinya-er/mastery-1.mp4",
          backupVideoUrl: sharedD,
          coveredTopics: ["Beginning-middle-end", "Narrative connectors", "Story voice"],
          checkpoint: {
            question: "Which story structure appears in this lesson?",
            choices: ["Beginning-middle-end", "Only ending", "Random list format"],
            correct: "Beginning-middle-end",
            hint: "It has three stages.",
          },
        },
      },
      phonics: {
        1: {
          videoUrl: "/video/tigrinya-er/phonics-1.mp4",
          backupVideoUrl: sharedB,
          coveredTopics: ["Sound pairs", "Pronunciation contrast", "Listening attention"],
          checkpoint: {
            question: "What should learners compare in this phonics lesson?",
            choices: ["Sound differences", "Card colors", "Lesson prices"],
            correct: "Sound differences",
            hint: "Phonics means sound focus.",
          },
        },
      },
      reading: {
        1: {
          videoUrl: "/video/tigrinya-er/reading-1.mp4",
          backupVideoUrl: sharedB,
          coveredTopics: ["Short story warmup", "Key-word detection", "Comprehension prep"],
          checkpoint: {
            question: "What is the main goal of this reading warmup video?",
            choices: ["Identify key words", "Skip comprehension", "Only repeat alphabet"],
            correct: "Identify key words",
            hint: "Think reading comprehension.",
          },
        },
      },
      conversation: {
        1: {
          videoUrl: "/video/tigrinya-er/conversation-1.mp4",
          backupVideoUrl: sharedF,
          coveredTopics: ["Greeting patterns", "Polite replies", "Confidence speaking"],
          checkpoint: {
            question: "Which speaking skill is practiced here?",
            choices: ["Polite greeting-response", "Silent reading", "Only typing"],
            correct: "Polite greeting-response",
            hint: "This is a speaking bootcamp lesson.",
          },
        },
      },
    };

    const perCourse = defaultsByLesson[course?.id] || {};
    return perCourse[currentLesson.id] || {
      videoUrl: sharedA,
      backupVideoUrl: sharedB,
      coveredTopics: [currentLesson.title, "Core vocabulary", "Speaking practice"],
      checkpoint: {
        question: "Which option best matches this video lesson topic?",
        choices: [currentLesson.title, "Unrelated topic", "Skip lesson"],
        correct: currentLesson.title,
        hint: "Choose the lesson title topic.",
      },
    };
  };

  const renderInteractiveBody = () => {
    const lessonContent = currentLesson.content || {};

    if (currentLesson.type === "video") {
      const videoDefaults = getVideoLessonDefaults();
      const videoLesson = lessonContent.videoLesson || {
        videoUrl: videoDefaults.videoUrl,
        backupVideoUrl: videoDefaults.backupVideoUrl,
        coveredTopics: videoDefaults.coveredTopics,
        prompt: lessonContent.videoPrompt || `Watch this ${course.title} lesson and answer the checkpoint question.`,
        checkpoint: videoDefaults.checkpoint,
        tasks: [
          "Watch the first minute and identify a key phrase.",
          "Replay one section and listen to pronunciation carefully.",
          "Say one phrase aloud before moving on.",
        ],
      };

      const checkpoint = videoLesson.checkpoint || {};
      const coveredTopics = Array.isArray(videoLesson.coveredTopics) ? videoLesson.coveredTopics : [];
      const tasks = Array.isArray(videoLesson.tasks) && videoLesson.tasks.length
        ? videoLesson.tasks
        : [
            "Watch the first minute and identify a key phrase.",
            "Replay one section and listen to pronunciation carefully.",
            "Say one phrase aloud before moving on.",
          ];
      const isVideoCorrect = videoChoice && videoChoice === checkpoint.correct;
      const completedTaskCount = tasks.reduce(
        (count, _task, idx) => count + (videoTasks[idx] ? 1 : 0),
        0
      );
      const allTasksDone = completedTaskCount === tasks.length;
      const noteReady = videoNote.trim().length >= 12;
      const timerDone = videoWatchSeconds >= VIDEO_REQUIRED_SECONDS;
      const canCompleteVideo = videoWatched && timerDone && isVideoCorrect && allTasksDone && noteReady;
      const watchProgress = Math.round((Math.min(videoWatchSeconds, VIDEO_REQUIRED_SECONDS) / VIDEO_REQUIRED_SECONDS) * 100);
      const overallProgress = Math.min(
        100,
        (timerDone ? 35 : 0) +
          (isVideoCorrect ? 25 : 0) +
          (allTasksDone ? 25 : Math.round((completedTaskCount / tasks.length) * 25)) +
          (noteReady ? 15 : Math.min(15, Math.round((videoNote.trim().length / 12) * 15)))
      );
      const averageCheckpoint = checkpointAttempts.length
        ? Math.round(
            checkpointAttempts.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0) /
              checkpointAttempts.length
          )
        : 0;

      const toggleTask = (taskIndex) => {
        setVideoTasks((prev) => {
          const next = [...prev];
          next[taskIndex] = !next[taskIndex];
          const nextDoneCount = tasks.reduce(
            (count, _task, idx) => count + (next[idx] ? 1 : 0),
            0
          );
          const nextAllTasksDone = nextDoneCount === tasks.length;
          setInteractionDone(videoWatched && isVideoCorrect && nextAllTasksDone && noteReady);
          return next;
        });
      };

      return (
        <div className="lesson-activity-card">
          <h3>Watch & Answer</h3>
          <p>{videoLesson.prompt}</p>
          <div className="lesson-video-shell">
            {!videoSourceError ? (
              <video
                className="lesson-video-frame"
                controls
                preload="metadata"
                onError={() => setVideoSourceError(true)}
              >
                <source src={videoLesson.videoUrl} type="video/mp4" />
                {videoLesson.backupVideoUrl ? <source src={videoLesson.backupVideoUrl} type="video/mp4" /> : null}
              </video>
            ) : (
              <div className="video-error-panel">
                <p>Video could not load in player. Open it directly:</p>
                <a
                  href={videoLesson.videoUrl || videoLesson.backupVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Video
                </a>
              </div>
            )}
          </div>

          {coveredTopics.length > 0 && (
            <div className="video-topic-panel">
              <p className="video-question">This Video Covers</p>
              <ul>
                {coveredTopics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="video-progress-panel">
            <div className="video-progress-head">
              <span>{`Watch verification: ${watchProgress}%`}</span>
              <span>{`${videoWatchSeconds}s / ${VIDEO_REQUIRED_SECONDS}s`}</span>
            </div>
            <div className="video-progress-track">
              <div className="video-progress-fill" style={{ width: `${watchProgress}%` }} />
            </div>
            <div className="video-progress-head">
              <span>{`Interactive completion: ${overallProgress}%`}</span>
              <span>{canCompleteVideo ? "Ready to complete" : "In progress"}</span>
            </div>
          </div>

          <div className="video-timer-actions">
            <button
              type="button"
              className="activity-btn"
              onClick={() => setVideoTimerRunning(true)}
              disabled={videoTimerRunning || timerDone}
            >
              {timerDone ? "Watch Verified" : videoTimerRunning ? "Timer Running..." : "Start Watch Timer"}
            </button>
            <button
              type="button"
              className="complete-btn secondary-btn"
              onClick={() => {
                setVideoTimerRunning(false);
                setVideoWatchSeconds(0);
                setVideoWatched(false);
                setInteractionDone(false);
              }}
            >
              Reset Timer
            </button>
          </div>

          <div className="video-checkpoint">
            <p className="video-question">{checkpoint.question}</p>
            <div className="quiz-options">
              {(checkpoint.choices || []).map((choice) => (
                <button
                  key={choice}
                  className={`quiz-option ${videoChoice === choice ? "selected" : ""}`}
                  onClick={() => {
                    setVideoChoice(choice);
                    const answerScore = choice === checkpoint.correct ? 100 : 30;
                    setCheckpointAttempts((prev) => [
                      {
                        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                        selected: choice,
                        correct: choice === checkpoint.correct,
                        score: answerScore,
                        at: new Date().toISOString(),
                      },
                      ...prev,
                    ].slice(0, 6));
                    setInteractionDone(videoWatched && timerDone && choice === checkpoint.correct && allTasksDone && noteReady);
                    setActivityScore(choice === checkpoint.correct ? 85 : 30);
                  }}
                >
                  {choice}
                </button>
              ))}
            </div>
            <div className="video-checkpoint-meta">
              <span>{`Retries: ${checkpointAttempts.length}`}</span>
              <span>{`Average score: ${averageCheckpoint}%`}</span>
            </div>
            {checkpointAttempts.length > 0 && (
              <ul className="checkpoint-history">
                {checkpointAttempts.map((attempt, idx) => (
                  <li key={attempt.id || `${attempt.at}_${idx}`}>
                    <span>{`Attempt ${checkpointAttempts.length - idx}`}</span>
                    <span>{attempt.correct ? "Correct" : "Try again"}</span>
                    <span>{`${attempt.score}%`}</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="complete-btn secondary-btn"
              onClick={() => setVideoChoice("")}
            >
              Retry Checkpoint
            </button>
            {videoChoice && !isVideoCorrect && (
              <p className="activity-hint">Hint: {checkpoint.hint || "Review the lesson and try again."}</p>
            )}
          </div>

          <div className="video-task-panel">
            <p className="video-question">Interactive Tasks ({completedTaskCount}/{tasks.length})</p>
            <div className="video-task-grid">
              {tasks.map((task, idx) => (
                <button
                  key={task}
                  type="button"
                  className={`video-task-btn ${videoTasks[idx] ? "done" : ""}`}
                  onClick={() => toggleTask(idx)}
                >
                  <span>{videoTasks[idx] ? "✓" : "○"}</span>
                  <span>{task}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="video-note-panel">
            <p className="video-question">Reflection Note</p>
            <textarea
              className="activity-textarea"
              value={videoNote}
              onChange={(event) => {
                const nextNote = event.target.value;
                setVideoNote(nextNote);
                setInteractionDone(
                  videoWatched &&
                  isVideoCorrect &&
                  allTasksDone &&
                  nextNote.trim().length >= 12
                );
              }}
              placeholder="Write what you learned from this video (at least 12 characters)."
            />
          </div>

          <button
            className="activity-btn"
            onClick={() => {
              setVideoWatched(true);
              setInteractionDone(timerDone && isVideoCorrect && allTasksDone && noteReady);
              setActivityScore(canCompleteVideo ? 95 : 55);
            }}
            disabled={!timerDone}
          >
            {timerDone ? "Mark Video Watched" : "Watch Timer Required"}
          </button>
          <p className="activity-hint">
            {canCompleteVideo
              ? "Great. You completed all video interactions."
              : "Complete watch, checkpoint, all tasks, and reflection note to finish this lesson."}
          </p>
        </div>
      );
    }

    if (currentLesson.type === "audio") {
      const phrases = lessonContent.phrases || ["ሰላም ንዓንተ", "እንዴታ እንበል", "ርካሽ እንበል"];
      return (
        <div className="lesson-activity-card">
          <h3>Listen & Repeat</h3>
          <p>Practice pronunciation for this lesson.</p>
          <div className="pronunciation-grid">
            {phrases.map((phrase, idx) => (
              <button
                key={phrase}
                className="activity-btn"
                onClick={() => {
                  speakText(phrase);
                  if (idx === 0) {
                    const next = listenCount + 1;
                    setListenCount(next);
                    if (next >= 1) {
                      setInteractionDone(true);
                      setActivityScore(90);
                    }
                  }
                }}
              >
                Pronounce {idx + 1}
              </button>
            ))}
          </div>
          <p className="activity-hint">Practice count: {listenCount}</p>
        </div>
      );
    }

    if (currentLesson.type === "quiz") {
      const quizVariant = Array.isArray(lessonContent.quizVariants) && lessonContent.quizVariants.length > 0
        ? lessonContent.quizVariants[Math.max(0, variantIndex) % lessonContent.quizVariants.length]
        : null;
      const quiz = lessonContent.quiz || {
        question: "Which word means hello?",
        choices: ["ቤት", "ሰላም", "መጽሓፍ"],
        correct: "ሰላም",
        hint: "It starts with ሰ",
      };
      const activeQuiz = quizVariant || quiz;
      const isHard = activeQuiz.difficulty === "hard";
      return (
        <div className="lesson-activity-card">
          <h3>Quick Quiz</h3>
          <p>{activeQuiz.question}</p>
          <p className="activity-hint">Difficulty: {getDifficultyLabel(activeQuiz.difficulty || "easy")}</p>
          <div className="quiz-options">
            {activeQuiz.choices.map((choice) => (
              <button
                key={choice}
                className={`quiz-option ${selectedChoice === choice ? "selected" : ""}`}
                onClick={() => {
                  setSelectedChoice(choice);
                  const isCorrect = choice === activeQuiz.correct;
                  setInteractionDone(isCorrect);
                  setHardBonus(isCorrect && isHard);
                  setActivityScore(isCorrect ? (isHard ? 100 : 90) : 20);
                }}
              >
                {choice}
              </button>
            ))}
          </div>
          {selectedChoice && selectedChoice !== activeQuiz.correct && (
            <p className="activity-hint">Try again. Hint: {activeQuiz.hint || "Check the lesson words."}</p>
          )}
        </div>
      );
    }

    if (currentLesson.type === "game") {
      const gameVariant = Array.isArray(lessonContent.gameVariants) && lessonContent.gameVariants.length > 0
        ? lessonContent.gameVariants[Math.max(0, variantIndex) % lessonContent.gameVariants.length]
        : null;
      const game = lessonContent.game || { question: "Type the Tigrinya word for House:", expected: "ቤት" };
      const activeGame = gameVariant || game;
      const isHard = activeGame.difficulty === "hard";
      return (
        <div className="lesson-activity-card">
          <h3>Mini Word Match</h3>
          <p>{activeGame.question}</p>
          <p className="activity-hint">Difficulty: {getDifficultyLabel(activeGame.difficulty || "easy")}</p>
          <input
            className="activity-input"
            value={gameWord}
            onChange={(e) => setGameWord(e.target.value)}
            placeholder="Type here"
          />
          <button
            className="activity-btn"
            onClick={() => {
              const isCorrect = gameWord.trim() === activeGame.expected;
              setInteractionDone(isCorrect);
              setHardBonus(isCorrect && isHard);
              setActivityScore(isCorrect ? (isHard ? 100 : 90) : 30);
            }}
          >
            Check Answer
          </button>
          {gameWord && gameWord.trim() !== activeGame.expected && (
            <p className="activity-hint">Not yet. Correct answer is {activeGame.expected}</p>
          )}
        </div>
      );
    }

    if (currentLesson.type === "practice") {
      return (
        <div className="lesson-activity-card">
          <h3>Writing Practice</h3>
          <p>{lessonContent.practicePrompt || "Write any 2 Tigrinya words you learned today."}</p>
          {lessonContent.storyStarter && (
            <div className="story-starter-panel">
              <span className="story-starter-label">Story starter</span>
              <p>{lessonContent.storyStarter}</p>
            </div>
          )}
          <textarea
            className="activity-textarea"
            value={practiceText}
            onChange={(e) => setPracticeText(e.target.value)}
            placeholder="Example: ሰላም, ቤት"
          />
          <button
            className="activity-btn"
            onClick={() => {
              const valid = practiceText.trim().length >= 6;
              setInteractionDone(valid);
              setActivityScore(valid ? 85 : 20);
            }}
          >
            Submit Practice
          </button>
        </div>
      );
    }

    return (
      <div className="lesson-activity-card">
        <h3>Reading Task</h3>
        <p>{lessonContent.readingTask || "Read the sample lines below and press complete reading."}</p>
        <button
          className="activity-btn"
          onClick={() => {
            setInteractionDone(true);
            setActivityScore(75);
          }}
        >
          Complete Reading
        </button>
      </div>
    );
  };

  return (
    <div className="lesson-view">
      <button className="back-btn" onClick={onBack}>Back to Lessons</button>
      <div className="lesson-content" style={{ background: course.color }}>
        <div className="lesson-header">
          <span className="lesson-icon">{getIcon(currentLesson.type)}</span>
          <h1>{currentLesson.title}</h1>
          <p className="lesson-order-label">{`Lesson ${currentLessonIndex + 1} of ${totalLessons} in ${course.title}`}</p>
          <span className="lesson-duration">{currentLesson.duration}</span>
        </div>
        <div className="lesson-body">
          <div className="reading-content">
            <h2>{currentLesson.type.charAt(0).toUpperCase() + currentLesson.type.slice(1)} Content</h2>
            <p>Learn about: {currentLesson.title}</p>
            {currentLesson.content?.story && (
              <div className="story-panel">
                <div className="story-panel-header">
                  <h3>{currentLesson.content.story.title}</h3>
                  <p>{currentLesson.content.story.summary}</p>
                </div>
                {currentLesson.content.story.image && (
                  <img
                    className="story-illustration"
                    src={currentLesson.content.story.image}
                    alt={`${currentLesson.content.story.title} illustration`}
                    loading="lazy"
                  />
                )}
                <div className="story-audio-toolbar">
                  <button
                    type="button"
                    className="activity-btn"
                    onClick={() => speakText(currentLesson.content.story.paragraphs.map((entry) => entry.ti).join(" ... "))}
                  >
                    Hear Full Story
                  </button>
                </div>
                <div className="story-paragraphs">
                  {currentLesson.content.story.paragraphs.map((entry) => (
                    <div key={entry.ti} className="story-line-card">
                      <div className="story-line-head">
                        <p className="story-line-ti">{entry.ti}</p>
                        <button
                          type="button"
                          className="story-line-audio"
                          onClick={() => speakText(entry.ti)}
                        >
                          Hear Line
                        </button>
                      </div>
                      <p className="story-line-en">{entry.en}</p>
                    </div>
                  ))}
                </div>
                {Array.isArray(currentLesson.content.story.vocabulary) && currentLesson.content.story.vocabulary.length > 0 && (
                  <div className="story-vocab-panel">
                    {currentLesson.content.story.vocabulary.map((word) => (
                      <div key={word.ti} className="story-vocab-chip">
                        <strong>{word.ti}</strong>
                        <span>{word.en}</span>
                      </div>
                    ))}
                  </div>
                )}
                {Array.isArray(currentLesson.content.story.prompts) && currentLesson.content.story.prompts.length > 0 && (
                  <div className="story-prompt-panel">
                    <p className="story-prompt-title">Story prompts</p>
                    <ul>
                      {currentLesson.content.story.prompts.map((prompt) => (
                        <li key={prompt}>{prompt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {Array.isArray(currentLesson.content?.storyLibrary) && currentLesson.content.storyLibrary.length > 0 && (
              <div className="story-library-panel">
                <div className="story-library-header">
                  <h3>More Eritrean Tigrinya Stories</h3>
                  <p>Choose another short story to read, hear, and retell.</p>
                </div>
                <div className="story-library-grid">
                  {currentLesson.content.storyLibrary.map((story) => (
                    <button
                      key={story.id}
                      type="button"
                      className={`story-library-card ${selectedLibraryStoryId === story.id ? "active" : ""}`}
                      onClick={() => setSelectedLibraryStoryId(story.id)}
                    >
                      <img src={story.image} alt={`${story.title} artwork`} loading="lazy" />
                      <div>
                        <strong>{story.title}</strong>
                        <span>{story.summary}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {(() => {
                  const activeLibraryStory = currentLesson.content.storyLibrary.find((story) => story.id === selectedLibraryStoryId) || currentLesson.content.storyLibrary[0];
                  if (!activeLibraryStory) {
                    return null;
                  }

                  return (
                    <div className="story-library-detail">
                      <div className="story-library-detail-head">
                        <div>
                          <h4>{activeLibraryStory.title}</h4>
                          <p>{activeLibraryStory.summary}</p>
                        </div>
                        <button
                          type="button"
                          className="activity-btn"
                          onClick={() => speakText(activeLibraryStory.paragraphs.map((entry) => entry.ti).join(" ... "))}
                        >
                          Hear Full Story
                        </button>
                      </div>
                      <div className="story-paragraphs compact">
                        {activeLibraryStory.paragraphs.map((entry) => (
                          <div key={entry.ti} className="story-line-card">
                            <div className="story-line-head">
                              <p className="story-line-ti">{entry.ti}</p>
                              <button
                                type="button"
                                className="story-line-audio"
                                onClick={() => speakText(entry.ti)}
                              >
                                Hear Line
                              </button>
                            </div>
                            <p className="story-line-en">{entry.en}</p>
                          </div>
                        ))}
                      </div>
                      <div className="story-vocab-panel">
                        {activeLibraryStory.vocabulary.map((word) => (
                          <div key={word.ti} className="story-vocab-chip">
                            <strong>{word.ti}</strong>
                            <span>{word.en}</span>
                          </div>
                        ))}
                      </div>
                      <div className="story-prompt-panel">
                        <p className="story-prompt-title">Retell prompts</p>
                        <ul>
                          {activeLibraryStory.prompts.map((prompt) => (
                            <li key={prompt}>{prompt}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            <div className="tigrinya-text">
              {(currentLesson.content?.lines || [
                { ti: "ሰላም ንዓንተ!", en: "Hello!" },
                { ti: "እንዴታ እንበል", en: "How are you?" },
                { ti: "ርካሽ እንበል", en: "I am fine" },
              ]).map((line) => (
                <p key={line.ti}>{line.ti} - {line.en}</p>
              ))}
              <button className="activity-btn" onClick={() => speakText((currentLesson.content?.lines?.[0]?.ti) || "ሰላም ንዓንተ")}>Hear Pronunciation</button>
            </div>
            {renderInteractiveBody()}
          </div>
        </div>
        <div className="lesson-footer">
          <div className="lesson-nav-actions">
            <button
              className="complete-btn secondary-btn"
              onClick={onPreviousLesson}
              disabled={currentLessonIndex <= 0}
            >
              Previous Lesson
            </button>
            <button
              className="complete-btn secondary-btn"
              onClick={onNextLesson}
              disabled={currentLessonIndex >= totalLessons - 1}
            >
              Next Lesson
            </button>
          </div>
          <p className="lesson-score">Score: {getScoreLabel(activityScore)} | Stars: {"★".repeat(getStars(activityScore))}{"☆".repeat(3 - getStars(activityScore))}</p>
          <button 
            className="complete-btn"
            onClick={() => onComplete(currentLesson.id, activityScore, hardBonus)}
            disabled={completedLessons.includes(currentLesson.id) || !interactionDone}
          >
            {completedLessons.includes(currentLesson.id)
              ? "✓ Completed"
              : interactionDone
                ? "Mark as Complete"
                : "Finish Activity First"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LessonList({ course, completedLessons, lessonScores, lessonSteps, onSelect, onBack }) {
  const getIcon = (type) => {
    const icons = { video: "🎬", reading: "📖", audio: "🎧", quiz: "❓", game: "🎮", practice: "✏️" };
    return icons[type] || "📚";
  };

  const totalStars = course.lessons.reduce((sum, lesson) => sum + getStars(lessonScores[lesson.id] || 0), 0);
  const totalBonusStars = course.lessons.reduce(
    (sum, lesson) => sum + (lessonSteps[lesson.id]?.hardBonus && completedLessons.includes(lesson.id) ? 1 : 0),
    0
  );
  const averageScore = course.lessons.length
    ? Math.round(course.lessons.reduce((sum, lesson) => sum + (lessonScores[lesson.id] || 0), 0) / course.lessons.length)
    : 0;

  return (
    <div>
      <div className="lessons-header" style={{ background: course.color }}>
        <button className="back-btn" onClick={onBack}>Back to Dashboard</button>
        <h1>{course.title}</h1>
        <p>{course.description}</p>
        <div className="progress-info">
          <span>{completedLessons.length} / {course.lessons.length} Completed</span>
        </div>
        <div className="progress-info">
          <span>Average Score: {averageScore}% | Stars: {totalStars + totalBonusStars} ({totalBonusStars} bonus)</span>
        </div>
      </div>
      <div className="lessons-list">
        {course.lessons.map((lesson, index) => (
          (() => {
            const score = lessonScores[lesson.id] || 0;
            const stars = getStars(score);
            const inProgress = Boolean(lessonSteps[lesson.id]?.interactionDone) && !completedLessons.includes(lesson.id);
            const bonusStars = lessonSteps[lesson.id]?.hardBonus && completedLessons.includes(lesson.id) ? 1 : 0;

            return (
          <div 
            key={lesson.id}
            className={`lesson-card ${completedLessons.includes(lesson.id) ? 'completed' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`Open lesson ${index + 1}: ${lesson.title}`}
            onClick={() => onSelect(lesson)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(lesson);
              }
            }}
          >
            <div className="lesson-number">{index + 1}</div>
            <div className="lesson-info">
              <h3>{lesson.title}</h3>
              <div className="lesson-meta">
                <span className="lesson-type">{getIcon(lesson.type)} {lesson.type}</span>
                <span className="lesson-duration">{lesson.duration}</span>
                <span className="lesson-stars">{"★".repeat(stars + bonusStars)}{"☆".repeat(Math.max(0, 3 - stars))}</span>
              </div>
            </div>
            <div className="lesson-status">
              {completedLessons.includes(lesson.id) ? (
                <span className="status-completed">✓</span>
              ) : inProgress ? (
                <span className="status-in-progress">◔</span>
              ) : (
                <span className="status-pending">○</span>
              )}
            </div>
          </div>
            );
          })()
        ))}
      </div>
    </div>
  );
}

export default function Lessons() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [lessonScores, setLessonScores] = useState({});
  const [lessonSteps, setLessonSteps] = useState({});
  const [loading, setLoading] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");

  const storageKey = `lesson_progress_${courseId}`;

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) {
      navigate("/login");
      return;
    }

    const loadData = async () => {
      try {
        await checkCourseAccess(courseId);
        const coursesData = await getMyCourses();
        const purchased = coursesData.purchasedCourses || [];

        if (!purchased.includes(courseId)) {
          setAccessDeniedMessage("You must purchase this course to access the content.");
          return;
        }

        const courseContent = courseLessons[courseId];
        if (courseContent) {
          setCourse({ id: courseId, ...courseContent });

          let localProgress = null;
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            try {
              localProgress = JSON.parse(raw);
            } catch {
              localProgress = null;
            }
          }

          try {
            const remoteProgress = await fetchCourseProgress(courseId);
            const localUpdatedAt = localProgress?.updatedAt ? new Date(localProgress.updatedAt).getTime() : 0;
            const remoteUpdatedAt = remoteProgress?.updatedAt ? new Date(remoteProgress.updatedAt).getTime() : 0;
            const preferred = remoteUpdatedAt >= localUpdatedAt ? remoteProgress : localProgress;

            setCompletedLessons(preferred?.completedLessons || []);
            setLessonScores(preferred?.lessonScores || {});
            setLessonSteps(preferred?.lessonSteps || {});
          } catch {
            setCompletedLessons(localProgress?.completedLessons || []);
            setLessonScores(localProgress?.lessonScores || {});
            setLessonSteps(localProgress?.lessonSteps || {});
          }
        }
      } catch (err) {
        console.error("Failed to load lessons:", err);
        if (/must purchase this course to access the content/i.test(String(err.message || ""))) {
          setAccessDeniedMessage("You must purchase this course to access the content.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId, navigate, storageKey]);

  const saveProgress = (nextCompleted, nextScores, nextSteps) => {
    const payload = {
      completedLessons: nextCompleted,
      lessonScores: nextScores,
      lessonSteps: nextSteps,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(storageKey, JSON.stringify(payload));

    if (localStorage.getItem("jwt")) {
      saveCourseProgress(courseId, payload).catch(() => {
        // Keep local progress when backend save fails.
      });
    }
  };

  const handleStepUpdate = (lessonId, stepPayload) => {
    setLessonSteps((prev) => {
      const next = { ...prev, [lessonId]: { ...(prev[lessonId] || {}), ...stepPayload } };
      saveProgress(completedLessons, lessonScores, next);
      return next;
    });
  };

  const handleCompleteLesson = (lessonId, score = 0, hasHardBonus = false) => {
    const nextCompleted = completedLessons.includes(lessonId)
      ? completedLessons
      : [...completedLessons, lessonId];
    const nextScores = { ...lessonScores, [lessonId]: score };
    const nextSteps = {
      ...lessonSteps,
      [lessonId]: {
        ...(lessonSteps[lessonId] || {}),
        interactionDone: true,
        score,
        hardBonus: hasHardBonus,
      },
    };

    setCompletedLessons(nextCompleted);
    setLessonScores(nextScores);
    setLessonSteps(nextSteps);
    saveProgress(nextCompleted, nextScores, nextSteps);
  };

  const handleBack = () => {
    if (currentLesson) {
      setCurrentLesson(null);
    } else {
      navigate("/dashboard");
    }
  };

  const currentLessonIndex = currentLesson
    ? course?.lessons?.findIndex((lesson) => lesson.id === currentLesson.id)
    : -1;

  const handleNextLesson = useCallback(() => {
    if (!course || currentLessonIndex < 0 || currentLessonIndex >= course.lessons.length - 1) {
      return;
    }
    setCurrentLesson(course.lessons[currentLessonIndex + 1]);
  }, [course, currentLessonIndex]);

  const handlePreviousLesson = useCallback(() => {
    if (!course || currentLessonIndex <= 0) {
      return;
    }
    setCurrentLesson(course.lessons[currentLessonIndex - 1]);
  }, [course, currentLessonIndex]);

  useEffect(() => {
    if (!currentLesson) {
      return;
    }

    const onKeyDown = (event) => {
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase?.();
      const isTypingField =
        tagName === "input" ||
        tagName === "textarea" ||
        target?.isContentEditable;

      if (isTypingField) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePreviousLesson();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNextLesson();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentLesson, handleNextLesson, handlePreviousLesson]);

  if (loading) {
    return (
      <div className="lessons-page">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading lessons...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="lessons-page">
        <div className="error-container">
          <h2>{accessDeniedMessage ? "Access Restricted" : "Course not found"}</h2>
          <p>{accessDeniedMessage || "You may not have purchased this course yet."}</p>
          <button onClick={() => navigate("/pricing")}>View Courses</button>
        </div>
      </div>
    );
  }

  return (
    <div className="lessons-page">
      {currentLesson ? (
        <LessonContent 
          key={currentLesson.id}
          course={course} 
          currentLesson={currentLesson} 
          currentLessonIndex={currentLessonIndex}
          totalLessons={course.lessons.length}
          completedLessons={completedLessons}
          lessonScores={lessonScores}
          lessonSteps={lessonSteps}
          onComplete={handleCompleteLesson}
          onBack={() => setCurrentLesson(null)}
          onStepUpdate={handleStepUpdate}
          onNextLesson={handleNextLesson}
          onPreviousLesson={handlePreviousLesson}
        />
      ) : (
        <LessonList 
          course={course} 
          completedLessons={completedLessons}
          lessonScores={lessonScores}
          lessonSteps={lessonSteps}
          onSelect={setCurrentLesson}
          onBack={handleBack}
        />
      )}
    </div>
  );
}


export const COURSE_CATALOG = [
    {
        id: "basic",
        title: "Basic Tigrinya",
        level: "Starter",
        price: 1.0,
        duration: "3 weeks",
        image: "/img/ai-courses/basic.svg",
        description: "Learn the Tigrinya alphabet step by step with clear pronunciation.",
        color: "linear-gradient(135deg, #2f7bbd, #163f72)",
        lessons: ["Alphabet Recognition", "Letter Sounds", "Alphabet Practice"],
        features: [
            "Full Tigrinya alphabet focus",
            "Letter-by-letter pronunciation",
            "Guided alphabet drills",
            "Progress tracking"
        ]
    },
    {
        id: "intermediate",
        title: "Intermediate Tigrinya",
        level: "Intermediate",
        price: 19.99,
        duration: "6 weeks",
        image: "/img/ai-courses/standard.svg",
        description: "Build strong Tigrinya vocabulary with practical words and usage.",
        color: "linear-gradient(135deg, #d97757, #8a2f4d)",
        lessons: ["Core Word Bank", "Everyday Tigrinya Words", "Word Practice"],
        features: [
            "Essential word categories",
            "Daily-use Tigrinya vocabulary",
            "Meaning and usage practice",
            "Priority support"
        ],
        popular: true
    },
    {
        id: "advanced",
        title: "Advanced Tigrinya",
        level: "Advanced",
        price: 39.99,
        duration: "10 weeks",
        image: "/img/ai-courses/mastery.svg",
        description: "Practice sentence meaning using English sentences with Tigrinya context.",
        color: "linear-gradient(135deg, #1f7a6c, #0d4f57)",
        lessons: ["English Sentence Meaning", "Sentence Structure", "Advanced Sentence Practice"],
        features: [
            "English sentence interpretation",
            "Sentence-level fluency practice",
            "Advanced comprehension tasks",
            "Certificate of completion"
        ]
    }
];

export const COURSE_MAP = COURSE_CATALOG.reduce((acc, course) => {
    acc[course.id] = course;
    return acc;
}, {});

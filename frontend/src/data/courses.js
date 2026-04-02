export const COURSE_CATALOG = [
    {
        id: "basic",
        title: "Basic Tigrinya",
        level: "Starter",
        price: 1.0,
        duration: "3 weeks",
        image: "/img/ai-courses/basic.svg",
        description: "Start with core letters, sounds, and everyday greeting phrases.",
        color: "linear-gradient(135deg, #2f7bbd, #163f72)",
        lessons: ["Letter Recognition", "Basic Words", "Pronunciation"],
        features: [
            "Learn all Tigrinya letters",
            "Basic vocabulary (50+ words)",
            "Audio pronunciation",
            "Progress tracking"
        ]
    },
    {
        id: "standard",
        title: "Standard Tigrinya",
        level: "Core",
        price: 19.99,
        duration: "6 weeks",
        image: "/img/ai-courses/standard.svg",
        description: "Build confidence with vocabulary expansion, games, and writing practice.",
        color: "linear-gradient(135deg, #d97757, #8a2f4d)",
        lessons: ["Everything in Basic", "Interactive Games", "Writing Practice"],
        features: [
            "Everything in Basic",
            "Extended vocabulary (200+ words)",
            "Interactive games",
            "Letter writing practice",
            "Priority support"
        ],
        popular: true
    },
    {
        id: "premium",
        title: "Premium Tigrinya",
        level: "Advanced",
        price: 39.99,
        duration: "10 weeks",
        image: "/img/ai-courses/premium.svg",
        description: "Unlock advanced fluency paths with guided videos and tutoring sessions.",
        color: "linear-gradient(135deg, #1f7a6c, #0d4f57)",
        lessons: ["Everything in Standard", "Video Lessons", "1-on-1 Tutoring"],
        features: [
            "Everything in Standard",
            "Unlimited vocabulary access",
            "Advanced games",
            "Video lessons",
            "1-on-1 tutoring session",
            "Certificate of completion"
        ]
    },
    {
        id: "family",
        title: "Family Conversation Pack",
        level: "Practical",
        price: 14.99,
        duration: "4 weeks",
        image: "/img/ai-courses/family.svg",
        description: "Practice parent-child dialogue, home routines, and daily communication.",
        color: "linear-gradient(135deg, #ffb385, #f06b8b)",
        lessons: ["Family greetings", "Home routines", "Conversation role play"],
        features: [
            "Family-focused conversation drills",
            "Parent-child dialogue templates",
            "Daily routine vocabulary",
            "Role-play speaking prompts"
        ]
    },
    {
        id: "mastery",
        title: "Storytelling Mastery",
        level: "Fluency",
        price: 29.99,
        duration: "8 weeks",
        image: "/img/ai-courses/mastery.svg",
        description: "Develop fluent speaking through narrative flow and confidence challenges.",
        color: "linear-gradient(135deg, #7f7fd5, #51a7f9)",
        lessons: ["Narrative flow", "Story retell challenge", "Advanced speech practice"],
        features: [
            "Narrative sentence building",
            "Story retelling activities",
            "Advanced pronunciation practice",
            "Confidence challenge missions"
        ]
    },
    {
        id: "phonics",
        title: "Phonics & Sound Lab",
        level: "Skill Builder",
        price: 12.99,
        duration: "5 weeks",
        image: "/img/ai-courses/phonics.svg",
        description: "Train listening and pronunciation with focused sound drills and mini games.",
        color: "linear-gradient(135deg, #46b58d, #0b5e73)",
        lessons: ["Sound matching", "Pronunciation drills", "Listening checks"],
        features: [
            "Targeted sound-pair exercises",
            "Repeat-after-audio drills",
            "Listening challenge rounds",
            "Pronunciation score tracker"
        ]
    },
    {
        id: "reading",
        title: "Reading Club",
        level: "Comprehension",
        price: 16.99,
        duration: "6 weeks",
        image: "/img/ai-courses/reading.svg",
        description: "Improve reading speed and understanding with short stories and quizzes.",
        color: "linear-gradient(135deg, #5e7ce2, #2b3f98)",
        lessons: ["Short stories", "Comprehension checks", "Read aloud practice"],
        features: [
            "Guided sentence-by-sentence reading",
            "Short story challenges",
            "Comprehension checkpoints",
            "Read-aloud fluency tasks"
        ]
    },
    {
        id: "conversation",
        title: "Speaking Confidence Bootcamp",
        level: "Communication",
        price: 22.99,
        duration: "7 weeks",
        image: "/img/ai-courses/conversation.svg",
        description: "Speak naturally in real scenarios with role-play and confidence missions.",
        color: "linear-gradient(135deg, #f39c55, #c74a3b)",
        lessons: ["Daily situations", "Role play practice", "Confidence missions"],
        features: [
            "Scenario-based speaking drills",
            "Conversation starter toolkit",
            "Confidence scoring after each task",
            "Real-life dialogue practice"
        ]
    }
];

export const COURSE_MAP = COURSE_CATALOG.reduce((acc, course) => {
    acc[course.id] = course;
    return acc;
}, {});

/*
 * All site content that changes over time lives here.
 *
 * To add a new course: copy one entry in `courses`, give it a unique `slug`,
 * and fill in the fields. Set `featured: true` on the course the homepage
 * should spotlight (only one). Set `status: "soon"` to show it as coming soon
 * without an enroll button.
 */
window.SITE = {
  brand: {
    name: "LatentQuest",
    url: "https://latentquest.ai/",
    github: "LatentQuest",
  },

  // Coupon requests go to this person on LinkedIn.
  couponContact: {
    firstName: "Vahid",
    linkedin: "https://www.linkedin.com/in/seyedvahidmirnezami",
  },

  // Display order: Mohammad first, then Vahid (used everywhere names appear together).
  instructors: [
    {
      name: "Mohammad R. Khalili Shoja",
      role: "Staff Data Scientist, Walmart Global Tech",
      photo: "assets/img/people/mohammad.jpg",
      bio: "Recommender systems, ranking and retrieval at web scale. Previously tech lead for paid-search relevance at Microsoft. Ph.D. in Computer Engineering from Iowa State University.",
      links: {
        Website: "https://khalili65.github.io/",
        GitHub: "https://github.com/khalili65",
        LinkedIn: "https://www.linkedin.com/in/mohammad-reza-khalili-shoja",
      },
    },
    {
      name: "Seyed Vahid Mirnezami",
      role: "Senior Computer Vision Scientist, Bayer Crop Science",
      photo: "assets/img/people/vahid.jpg",
      bio: "Deep learning, generative AI and vision–language models in production. Ph.D. from Iowa State University, with research on computer vision for high-throughput plant phenotyping.",
      links: {
        Website: "https://seyedvahidmirnezami.github.io/",
        GitHub: "https://github.com/seyedvahidmirnezami",
        LinkedIn: "https://www.linkedin.com/in/seyedvahidmirnezami",
      },
    },
  ],

  courses: [
    {
      slug: "transformers",
      featured: true,
      status: "live", // "live" or "soon"
      title: "Master Transformers from Scratch: BERT, ViT & AI Search",
      shortTitle: "Transformers from Scratch",
      tagline: "From vectors and attention math to BERT, Vision Transformers and two-tower semantic search.",
      url: "https://www.udemy.com/course/master-transformers-from-scratch-bert-vit-ai-search/?referralCode=741D2251A98D41859FB9",
      image: "assets/img/og-cover.jpg",
      instructors: ["Mohammad R. Khalili Shoja", "Seyed Vahid Mirnezami"],
      tags: ["NLP", "Vision", "Search", "PyTorch"],
      sessionsLabel: "17 sessions",
      pillars: [
        { icon: "numbers", color: "cyan", title: "Real numbers first",
          text: "Self-attention, Q/K/V and multi-head attention computed by hand on a three-word sentence, so every formula has a number you can check." },
        { icon: "code", color: "amber", title: "Then build it in PyTorch",
          text: "Tensors, autograd and <code>nn.Module</code>, then a BERT-style masked language model written layer by layer." },
        { icon: "star", color: "violet", title: "Then ship real projects",
          text: "Text classification, named entity recognition, distillation, Vision Transformers and two-tower semantic search on real Kaggle data." },
      ],
      ctaTitle: "Interview-ready intuition and working code, in one place.",
      ctaSub: "A guide for every session, and runnable code for every project.",
      tracks: [
        { owner: "seyedvahidmirnezami", name: "Attention math", range: "0–7", lessons: [
          [0, "Vectors, Dot Products, and Matrices"],
          [1, "Why Attention? From Ambiguity to Context"],
          [2, "Self-Attention with Real Numbers", "self-attention-from-scratch"],
          [3, "Making Attention Learnable: Query, Key, and Value", "self-attention-from-scratch"],
          [4, "Multi-Head Attention", "self-attention-from-scratch"],
          [5, "The Transformer Encoder Block", "transformer-encoder-pytorch"],
          [6, "Positional Encoding", "transformer-encoder-pytorch"],
          [7, "BERT: The Encoder in the Wild"],
        ]},
        { owner: "seyedvahidmirnezami", name: "PyTorch", range: "8–10", lessons: [
          [8, "Tensors, Shape & the Tree Mental Model"],
          [9, "Autograd & nn.Module"],
          [10, "Data Pipelines & Layer Containers"],
        ]},
        { owner: "seyedvahidmirnezami", name: "BERT projects", range: "11–14", lessons: [
          [11, "BERT-Base Masked Language Model Pretraining in PyTorch"],
          [12, "Fine-Tune BERT for Disaster Tweet Classification"],
          [13, "Fine-Tune BERT for Named Entity Recognition"],
          [14, "Knowledge Distillation and DistilBERT"],
        ]},
        { owner: "seyedvahidmirnezami", name: "Vision & search", range: "15–16", lessons: [
          [15, "Vision Transformers and Cassava Leaf Disease", "vision-transformer-cassava"],
          [16, "Two Towers From Scratch: Semantic Search", "semantic-search-two-tower"],
        ]},
      ],
    },
  ],

  // Free code. `owner` is the GitHub account; `course` links each repo to a course slug above.
  repos: [
    { owner: "seyedvahidmirnezami", name: "self-attention-from-scratch", course: "transformers", sessions: "Sessions 2–4",
      desc: "Self-attention explained with real numbers, then built in NumPy and PyTorch. Tests check every hand-worked number.",
      tags: ["attention", "numpy", "pytorch"] },
    { owner: "seyedvahidmirnezami", name: "transformer-encoder-pytorch", course: "transformers", sessions: "Sessions 5–6",
      desc: "The full encoder block from scratch, plus an experiment: 50% accuracy without positional encoding, 100% with it.",
      tags: ["encoder", "positional-encoding", "pytorch"] },
    { owner: "seyedvahidmirnezami", name: "vision-transformer-cassava", course: "transformers", sessions: "Session 15",
      desc: "Fine-tune a Vision Transformer on Kaggle cassava leaf photos, from patches to a competition submission.",
      tags: ["vit", "computer-vision", "kaggle"] },
    { owner: "seyedvahidmirnezami", name: "semantic-search-two-tower", course: "transformers", sessions: "Session 16",
      desc: "Two-tower retrieval and cross-encoder re-ranking, built by hand from a plain transformer encoder.",
      tags: ["retrieval", "embeddings", "kaggle"] },
  ],
};

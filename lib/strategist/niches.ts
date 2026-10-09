/**
 * Preset niches for the Strategist quiz, grouped for the niche step.
 *
 * Each niche carries everything the later steps suggest from it: core topics,
 * audience interests and struggles, and common search phrases for keywords.
 * Custom niches typed with "+ Other" fall back to general suggestions.
 */

export interface NicheData {
  label: string;
  emoji: string;
  topics: string[];
  interests: string[];
  struggles: string[];
  keywords: string[];
}

export interface NicheCategory {
  label: string;
  niches: NicheData[];
}

export const NICHE_CATEGORIES: NicheCategory[] = [
  {
    label: 'Business & personal brand',
    niches: [
      {
        label: 'Content agency', emoji: '🎥',
        topics: ['Client results', 'Content strategy', 'Short-form video', 'UGC', 'Behind the scenes', 'Agency growth'],
        interests: ['Content that converts', 'Case studies', 'Social media trends', 'Brand storytelling'],
        struggles: ['No time to post', 'Low engagement', 'Inconsistent content', 'Not sure what to post'],
        keywords: ['content creation agency', 'social media content for brands', 'short form video strategy', 'ugc for brands', 'content marketing tips'],
      },
      {
        label: 'Personal branding', emoji: '🪞',
        topics: ['Thought leadership', 'LinkedIn growth', 'Storytelling', 'Building authority', 'Networking', 'Public speaking'],
        interests: ['Standing out online', 'Growing a following', 'Speaking gigs', 'Career opportunities'],
        struggles: ['Fear of posting', 'Imposter syndrome', 'No clear message', 'Inconsistent posting'],
        keywords: ['personal branding tips', 'how to build a personal brand', 'linkedin personal brand', 'thought leadership content', 'grow on linkedin'],
      },
      {
        label: 'Entrepreneurship', emoji: '🚀',
        topics: ['Starting a business', 'Startup stories', 'Fundraising', 'Productivity', 'Scaling', 'Founder life'],
        interests: ['Business ideas', 'Founder stories', 'Growth tactics', 'Tools and systems'],
        struggles: ['Getting first customers', 'Cash flow', 'Doing everything alone', 'Burnout'],
        keywords: ['how to start a business', 'small business tips', 'startup advice', 'entrepreneur mindset', 'business ideas'],
      },
      {
        label: 'Marketing', emoji: '📣',
        topics: ['Digital marketing', 'SEO', 'Paid ads', 'Email marketing', 'Copywriting', 'Sales funnels'],
        interests: ['Growth hacks', 'Marketing tools', 'Ad creatives', 'Case studies'],
        struggles: ['Low conversions', 'Small budget', 'Measuring ROI', 'Too many channels'],
        keywords: ['digital marketing tips', 'marketing strategy', 'seo for beginners', 'facebook ads tutorial', 'email marketing tips'],
      },
      {
        label: 'Social media growth', emoji: '📈',
        topics: ['Instagram growth', 'TikTok growth', 'YouTube growth', 'Algorithm tips', 'Content ideas', 'Monetisation'],
        interests: ['Going viral', 'Creator tools', 'Brand deals', 'Trends'],
        struggles: ['Stuck at low views', 'Algorithm changes', 'Running out of ideas', 'Slow growth'],
        keywords: ['how to grow on instagram', 'tiktok growth tips', 'youtube growth strategy', 'content ideas', 'social media tips'],
      },
      {
        label: 'Freelancing', emoji: '💼',
        topics: ['Finding clients', 'Pricing', 'Upwork & Fiverr', 'Remote work', 'Portfolio', 'Client management'],
        interests: ['Working remotely', 'Higher rates', 'Tools for freelancers', 'Freedom'],
        struggles: ['Inconsistent income', 'Finding clients', 'Underpricing', 'Difficult clients'],
        keywords: ['how to start freelancing', 'find freelance clients', 'freelance pricing', 'upwork tips', 'remote work tips'],
      },
      {
        label: 'Coaching & consulting', emoji: '🎯',
        topics: ['Business coaching', 'Life coaching', 'Getting clients', 'Online courses', 'Frameworks', 'Client wins'],
        interests: ['Proven frameworks', 'Transformation stories', 'Accountability', 'Expert advice'],
        struggles: ['Not sure where to start', 'Stuck at a plateau', 'Lack of clarity', 'No accountability'],
        keywords: ['business coach', 'life coaching tips', 'how to get coaching clients', 'consulting business', 'online course creation'],
      },
      {
        label: 'Career & jobs', emoji: '🧑‍💼',
        topics: ['Job hunting', 'CV & resume', 'Interviews', 'Career change', 'Salary negotiation', 'Remote jobs'],
        interests: ['Better-paying roles', 'Promotions', 'Career growth', 'Remote work'],
        struggles: ['Getting no replies', 'Interview nerves', 'Feeling stuck', 'Low pay'],
        keywords: ['job search tips', 'resume tips', 'interview tips', 'career change advice', 'how to negotiate salary'],
      },
      {
        label: 'Leadership', emoji: '🧭',
        topics: ['Managing teams', 'Company culture', 'Decision making', 'Hiring', 'Communication', 'Executive habits'],
        interests: ['Leading well', 'Team performance', 'Leadership books', 'Executive presence'],
        struggles: ['Difficult conversations', 'Delegating', 'Team burnout', 'First-time manager'],
        keywords: ['leadership skills', 'how to manage a team', 'first time manager tips', 'company culture', 'leadership tips'],
      },
      {
        label: 'E-commerce', emoji: '🛒',
        topics: ['Shopify', 'Dropshipping', 'Amazon FBA', 'Product launches', 'Store design', 'Online ads'],
        interests: ['Winning products', 'Store growth', 'Sales tools', 'Brand building'],
        struggles: ['Low sales', 'High ad costs', 'Cart abandonment', 'Finding products'],
        keywords: ['how to start an online store', 'shopify tips', 'dropshipping for beginners', 'ecommerce marketing', 'amazon fba'],
      },
      {
        label: 'Real estate', emoji: '🏠',
        topics: ['Buying a home', 'Property investing', 'Rentals', 'House tours', 'Market updates', 'Realtor life'],
        interests: ['Property deals', 'Passive income', 'Dream homes', 'Market trends'],
        struggles: ['Saving a deposit', 'High prices', 'Finding deals', 'Getting a mortgage'],
        keywords: ['real estate investing', 'first time home buyer', 'rental property tips', 'house tour', 'real estate market'],
      },
      {
        label: 'Finance', emoji: '💰',
        topics: ['Investing', 'Budgeting', 'Crypto', 'Side hustles', 'Real estate', 'Saving money'],
        interests: ['Passive income', 'Index funds', 'Budget apps', 'Early retirement'],
        struggles: ['Living paycheck to paycheck', 'Debt', 'Where to invest', 'Saving consistently'],
        keywords: ['how to invest', 'money saving tips', 'budgeting for beginners', 'passive income ideas', 'personal finance tips'],
      },
    ],
  },
  {
    label: 'Tech & creative',
    niches: [
      {
        label: 'Tech', emoji: '💻',
        topics: ['Gadget reviews', 'Coding', 'AI tools', 'Smartphones', 'PC builds', 'Tech news'],
        interests: ['New gadgets', 'AI tools', 'Productivity apps', 'Coding projects'],
        struggles: ['Information overload', 'Choosing what to buy', 'Keeping up', 'Learning to code'],
        keywords: ['tech tips', 'best budget phone', 'ai tools for productivity', 'unboxing and review', 'tech for beginners'],
      },
      {
        label: 'AI & automation', emoji: '🤖',
        topics: ['ChatGPT & Claude', 'AI for business', 'No-code tools', 'Automation workflows', 'AI news', 'Prompting'],
        interests: ['Saving time', 'New AI tools', 'Automating work', 'Future of work'],
        struggles: ['Too many tools', 'Not sure where to start', 'Keeping up', 'Getting good results'],
        keywords: ['ai tools', 'how to use ai', 'ai for business', 'automation tools', 'chatgpt tips'],
      },
      {
        label: 'Design', emoji: '🎨',
        topics: ['Graphic design', 'UI/UX', 'Branding', 'Illustration', 'Canva & Figma', 'Design portfolio'],
        interests: ['Design inspiration', 'Creative tools', 'Freelance design', 'Typography'],
        struggles: ['Creative block', 'Finding clients', 'Feedback rounds', 'Building a portfolio'],
        keywords: ['graphic design tips', 'ui ux design', 'logo design', 'figma tutorial', 'design inspiration'],
      },
      {
        label: 'Photography & video', emoji: '📷',
        topics: ['Camera gear', 'Editing', 'Filmmaking', 'Phone photography', 'Lighting', 'Drone shots'],
        interests: ['Gear reviews', 'Editing tricks', 'Cinematic shots', 'Getting paid gigs'],
        struggles: ['Expensive gear', 'Editing takes forever', 'Bad lighting', 'Finding clients'],
        keywords: ['photography tips', 'video editing tutorial', 'cinematic video', 'best camera for beginners', 'lightroom editing'],
      },
      {
        label: 'Music', emoji: '🎵',
        topics: ['Music production', 'Covers', 'Songwriting', 'Instrument lessons', 'Music reviews', 'Artist life'],
        interests: ['New releases', 'Studio gear', 'Learning instruments', 'Growing as an artist'],
        struggles: ['Getting heard', 'Mixing and mastering', 'Writer’s block', 'Monetising music'],
        keywords: ['music production tutorial', 'how to make beats', 'guitar lessons for beginners', 'songwriting tips', 'how to promote your music'],
      },
      {
        label: 'Books & writing', emoji: '📖',
        topics: ['Book reviews', 'Writing tips', 'Self-publishing', 'Reading lists', 'Poetry', 'Author life'],
        interests: ['Book recommendations', 'Writing craft', 'Publishing', 'Reading habits'],
        struggles: ['Finishing a draft', 'Writer’s block', 'Finding readers', 'Making time to read'],
        keywords: ['book recommendations', 'writing tips', 'how to self publish', 'books to read', 'how to write a book'],
      },
    ],
  },
  {
    label: 'Health & lifestyle',
    niches: [
      {
        label: 'Fitness', emoji: '💪',
        topics: ['Home workouts', 'Weight loss', 'Strength', 'Yoga', 'Running', 'Nutrition'],
        interests: ['Meal prep', 'Home gym gear', 'Mental health', 'Healthy eating'],
        struggles: ['Low motivation', 'Gym anxiety', 'Plateaus', 'No time'],
        keywords: ['no equipment workout', '15 minute workout', 'beginner fitness', 'full body workout', 'workout at home', 'fat burning workout'],
      },
      {
        label: 'Health & wellness', emoji: '🧘',
        topics: ['Healthy habits', 'Sleep', 'Gut health', 'Women’s health', 'Supplements', 'Self-care'],
        interests: ['Natural remedies', 'Morning routines', 'Healthy eating', 'Longevity'],
        struggles: ['Low energy', 'Poor sleep', 'Stress', 'Conflicting advice'],
        keywords: ['healthy habits', 'how to sleep better', 'gut health tips', 'self care routine', 'wellness tips'],
      },
      {
        label: 'Mental health', emoji: '🧠',
        topics: ['Anxiety', 'Mindfulness', 'Therapy talk', 'Burnout', 'Self-esteem', 'Journaling'],
        interests: ['Coping tools', 'Meditation', 'Personal stories', 'Healthy boundaries'],
        struggles: ['Overthinking', 'Anxiety', 'Burnout', 'Feeling alone'],
        keywords: ['how to deal with anxiety', 'mental health tips', 'mindfulness for beginners', 'burnout recovery', 'journaling prompts'],
      },
      {
        label: 'Cooking', emoji: '🍳',
        topics: ['Quick meals', 'Baking', 'Healthy recipes', 'Meal prep', 'Vegan', 'Street food'],
        interests: ['Easy recipes', 'Meal prep', 'Healthy eating', 'World cuisines'],
        struggles: ['No time to cook', 'Picky eaters', 'Small budget', 'Limited skills'],
        keywords: ['easy recipes', 'quick dinner ideas', 'healthy meal prep', 'cooking for beginners', 'budget meals'],
      },
      {
        label: 'Beauty', emoji: '💄',
        topics: ['Makeup', 'Skincare', 'Haircare', 'Nails', 'Product reviews', 'Tutorials'],
        interests: ['Skincare routines', 'Product dupes', 'Makeup looks', 'Clean beauty'],
        struggles: ['Acne', 'Too many products', 'Sensitive skin', 'Budget'],
        keywords: ['skincare routine', 'makeup tutorial', 'drugstore dupes', 'beauty tips', 'everyday makeup'],
      },
      {
        label: 'Fashion', emoji: '👗',
        topics: ['Outfit ideas', 'Streetwear', 'Thrifting', 'Capsule wardrobe', 'Styling tips', 'Hauls'],
        interests: ['Trends', 'Affordable fashion', 'Sustainable brands', 'Personal style'],
        struggles: ['Nothing to wear', 'Small budget', 'Finding my style', 'Body confidence'],
        keywords: ['outfit ideas', 'how to style', 'capsule wardrobe', 'fashion haul', 'streetwear outfits'],
      },
      {
        label: 'Travel', emoji: '✈️',
        topics: ['Budget travel', 'Solo travel', 'Van life', 'Luxury travel', 'Travel tips', 'Food tours'],
        interests: ['Hidden gems', 'Travel hacks', 'Local food', 'Packing tips'],
        struggles: ['Tight budget', 'Planning overwhelm', 'Safety worries', 'Limited time off'],
        keywords: ['travel tips', 'budget travel guide', 'things to do in', 'travel vlog', 'packing tips'],
      },
      {
        label: 'Home & interior', emoji: '🛋️',
        topics: ['Home decor', 'Renovation', 'Organisation', 'Small spaces', 'Cleaning', 'Room makeovers'],
        interests: ['Decor ideas', 'Before and afters', 'Budget finds', 'Cosy spaces'],
        struggles: ['Small space', 'Tight budget', 'Clutter', 'Renting restrictions'],
        keywords: ['home decor ideas', 'room makeover', 'small apartment ideas', 'home organization', 'cleaning tips'],
      },
      {
        label: 'Parenting', emoji: '👨‍👩‍👧',
        topics: ['Newborns', 'Toddlers', 'Teens', 'Family life', 'Education at home', 'Mom & dad life'],
        interests: ['Parenting hacks', 'Kids activities', 'Family routines', 'Child development'],
        struggles: ['Sleepless nights', 'Tantrums', 'Screen time', 'Mum and dad guilt'],
        keywords: ['parenting tips', 'toddler activities', 'newborn tips', 'family routine', 'gentle parenting'],
      },
      {
        label: 'Relationships', emoji: '❤️',
        topics: ['Dating', 'Marriage', 'Communication', 'Breakups', 'Friendships', 'Self-love'],
        interests: ['Healthy relationships', 'Dating advice', 'Real stories', 'Love languages'],
        struggles: ['Trust issues', 'Being single', 'Arguments', 'Moving on'],
        keywords: ['relationship advice', 'dating tips', 'how to communicate better', 'healthy relationship', 'marriage advice'],
      },
      {
        label: 'Pets', emoji: '🐾',
        topics: ['Dogs', 'Cats', 'Pet training', 'Pet health', 'Funny pets', 'Pet products'],
        interests: ['Cute moments', 'Training tips', 'Pet food', 'Pet gear'],
        struggles: ['Bad behaviour', 'Vet costs', 'Separation anxiety', 'First-time owner'],
        keywords: ['dog training tips', 'cat care tips', 'puppy training', 'funny pets', 'best dog food'],
      },
      {
        label: 'Personal development', emoji: '🌱',
        topics: ['Productivity', 'Habits', 'Mindset', 'Goal setting', 'Discipline', 'Morning routines'],
        interests: ['Self-improvement', 'Books', 'Routines', 'Motivation'],
        struggles: ['Procrastination', 'No discipline', 'Lack of focus', 'Feeling stuck'],
        keywords: ['self improvement tips', 'how to stop procrastinating', 'productivity tips', 'morning routine', 'how to build habits'],
      },
      {
        label: 'Faith & spirituality', emoji: '🙏',
        topics: ['Bible study', 'Devotionals', 'Prayer', 'Meditation', 'Faith stories', 'Church life'],
        interests: ['Daily inspiration', 'Scripture', 'Community', 'Spiritual growth'],
        struggles: ['Staying consistent', 'Doubt', 'Finding community', 'Busy life'],
        keywords: ['daily devotional', 'bible study for beginners', 'prayer for today', 'spiritual growth', 'faith encouragement'],
      },
      {
        label: 'Sustainability', emoji: '🌍',
        topics: ['Zero waste', 'Climate', 'Eco products', 'Slow living', 'Ethical fashion', 'Green energy'],
        interests: ['Eco swaps', 'Climate news', 'Ethical brands', 'Simple living'],
        struggles: ['Eco products cost more', 'Where to start', 'Feeling it doesn’t matter', 'Greenwashing'],
        keywords: ['zero waste tips', 'sustainable living', 'eco friendly products', 'how to reduce waste', 'climate change explained'],
      },
      {
        label: 'DIY & crafts', emoji: '🧵',
        topics: ['Sewing', 'Woodworking', 'Upcycling', 'Crochet & knitting', 'Home DIY', 'Handmade business'],
        interests: ['Step-by-step projects', 'Tools and materials', 'Gift ideas', 'Selling handmade'],
        struggles: ['Unfinished projects', 'Expensive supplies', 'Lack of space', 'Beginner mistakes'],
        keywords: ['diy projects', 'crochet for beginners', 'woodworking projects', 'upcycling ideas', 'easy crafts'],
      },
      {
        label: 'Gardening', emoji: '🪴',
        topics: ['Houseplants', 'Vegetable garden', 'Small gardens', 'Plant care', 'Landscaping', 'Composting'],
        interests: ['Growing food', 'Plant care tips', 'Garden makeovers', 'Rare plants'],
        struggles: ['Killing plants', 'Pests', 'No garden space', 'Bad soil'],
        keywords: ['gardening for beginners', 'houseplant care', 'grow your own vegetables', 'small garden ideas', 'plant care tips'],
      },
      {
        label: 'Cars', emoji: '🚗',
        topics: ['Car reviews', 'Car mods', 'Detailing', 'Electric cars', 'Maintenance', 'Motorbikes'],
        interests: ['New models', 'Performance', 'Car culture', 'DIY repairs'],
        struggles: ['Repair costs', 'Choosing a car', 'Fuel costs', 'Dodgy mechanics'],
        keywords: ['car review', 'car maintenance tips', 'best used cars', 'electric car review', 'car detailing'],
      },
    ],
  },
  {
    label: 'Entertainment & learning',
    niches: [
      {
        label: 'Gaming', emoji: '🎮',
        topics: ["Let's plays", 'Esports', 'Game reviews', 'Speedruns', 'Mobile gaming', 'Streaming'],
        interests: ['New releases', 'Competitive play', 'Game lore', 'Setup upgrades'],
        struggles: ['Getting better', 'Finding good games', 'Lag and performance', 'Finding a squad'],
        keywords: ['gameplay walkthrough', 'best games 2026', 'gaming tips', 'pro tips and tricks', 'game review'],
      },
      {
        label: 'Film & TV', emoji: '🎬',
        topics: ['Movie reviews', 'TV recaps', 'Anime', 'Theories', 'Behind the scenes', 'What to watch'],
        interests: ['New releases', 'Fan theories', 'Hidden gems', 'Celebrity news'],
        struggles: ['Too much to watch', 'Spoilers', 'Finding good shows', 'Endless scrolling'],
        keywords: ['movie review', 'what to watch', 'tv show recap', 'best movies 2026', 'anime recommendations'],
      },
      {
        label: 'Comedy', emoji: '😂',
        topics: ['Skits', 'Stand-up', 'Pranks', 'Relatable content', 'Parody', 'Memes'],
        interests: ['Funny moments', 'Trending sounds', 'Characters', 'Reactions'],
        struggles: ['Running out of ideas', 'Jokes not landing', 'Staying original', 'Growing beyond one viral post'],
        keywords: ['funny videos', 'comedy skits', 'relatable content', 'try not to laugh', 'funny memes'],
      },
      {
        label: 'Sports', emoji: '⚽',
        topics: ['Football', 'Basketball', 'Highlights', 'Analysis', 'Training drills', 'Fantasy sports'],
        interests: ['Match highlights', 'Transfer news', 'Player stats', 'Training tips'],
        struggles: ['Improving my game', 'Following everything', 'Injuries', 'Finding a team'],
        keywords: ['football highlights', 'sports analysis', 'training drills', 'basketball tips', 'match preview'],
      },
      {
        label: 'Education', emoji: '📚',
        topics: ['Study tips', 'Languages', 'Science', 'Math', 'History', 'Exam prep'],
        interests: ['Study hacks', 'Online courses', 'Career growth', 'Productivity'],
        struggles: ['Procrastination', 'Exam stress', 'Staying focused', 'Retaining information'],
        keywords: ['study tips', 'how to learn faster', 'exam preparation', 'study with me', 'learning hacks'],
      },
      {
        label: 'Languages', emoji: '🗣️',
        topics: ['English', 'Spanish', 'French', 'Language hacks', 'Pronunciation', 'Learning stories'],
        interests: ['Speaking fluently', 'Travel phrases', 'Culture', 'Language apps'],
        struggles: ['Fear of speaking', 'Forgetting words', 'No one to practise with', 'Slow progress'],
        keywords: ['learn english', 'how to learn a language', 'spanish for beginners', 'language learning tips', 'speak fluently'],
      },
      {
        label: 'Science', emoji: '🔬',
        topics: ['Space', 'Biology', 'Physics', 'Experiments', 'Science news', 'Explainers'],
        interests: ['Mind-blowing facts', 'Space news', 'How things work', 'Experiments'],
        struggles: ['Complex topics', 'Misinformation', 'Boring textbooks', 'Too much jargon'],
        keywords: ['science explained', 'space facts', 'science experiments', 'how it works', 'physics explained'],
      },
      {
        label: 'News & politics', emoji: '📰',
        topics: ['Current events', 'Explainers', 'Local news', 'Opinion', 'Global affairs', 'Fact checks'],
        interests: ['Daily briefings', 'Context behind headlines', 'Debates', 'Fact checks'],
        struggles: ['Information overload', 'Bias', 'Fake news', 'Hard to follow'],
        keywords: ['news explained', 'current events', 'politics explained', 'daily news', 'fact check'],
      },
    ],
  },
  {
    label: 'Organisations & services',
    niches: [
      {
        label: 'Local business', emoji: '🏪',
        topics: ['Restaurants & cafes', 'Salons & barbers', 'Retail shops', 'Gyms & studios', 'Promotions', 'Customer stories'],
        interests: ['Local deals', 'New openings', 'Behind the scenes', 'Community events'],
        struggles: ['Getting foot traffic', 'Competing with big brands', 'No time for social media', 'Reviews'],
        keywords: ['near me', 'local business', 'best in town', 'small business', 'shop local'],
      },
      {
        label: 'Nonprofit & causes', emoji: '💚',
        topics: ['Fundraising', 'Volunteering', 'Impact stories', 'Awareness campaigns', 'Community projects', 'Events'],
        interests: ['Making a difference', 'Real impact stories', 'Ways to help', 'Community'],
        struggles: ['Raising funds', 'Donor fatigue', 'Getting volunteers', 'Being heard'],
        keywords: ['how to help', 'charity fundraising', 'volunteer opportunities', 'nonprofit', 'make a difference'],
      },
      {
        label: 'Healthcare', emoji: '🩺',
        topics: ['Health tips', 'Doctor explains', 'Dental', 'Clinic updates', 'Myths busted', 'Patient stories'],
        interests: ['Trusted advice', 'Prevention', 'Treatment options', 'Health myths'],
        struggles: ['Health anxiety', 'Cost of care', 'Confusing advice', 'Long waits'],
        keywords: ['doctor explains', 'health tips', 'symptoms of', 'when to see a doctor', 'health myths'],
      },
      {
        label: 'Legal', emoji: '⚖️',
        topics: ['Know your rights', 'Business law', 'Immigration', 'Contracts', 'Property law', 'Lawyer life'],
        interests: ['Plain-English law', 'Rights at work', 'Business protection', 'Real cases'],
        struggles: ['Legal jargon', 'Cost of lawyers', 'Not knowing their rights', 'Paperwork'],
        keywords: ['know your rights', 'lawyer explains', 'legal advice', 'business law basics', 'immigration tips'],
      },
      {
        label: 'Events & weddings', emoji: '💍',
        topics: ['Wedding planning', 'Event decor', 'Venues', 'Catering', 'Party ideas', 'Event highlights'],
        interests: ['Inspiration', 'Budget tips', 'Vendors', 'Trends'],
        struggles: ['Tight budget', 'Planning stress', 'Finding vendors', 'Last-minute changes'],
        keywords: ['wedding planning tips', 'event decor ideas', 'wedding on a budget', 'party ideas', 'wedding inspiration'],
      },
    ],
  },
];

/** Every preset niche, in display order */
export const NICHES: NicheData[] = NICHE_CATEGORIES.flatMap((c) => c.niches);

export function findNiche(label: string): NicheData | undefined {
  return NICHES.find((n) => n.label === label);
}

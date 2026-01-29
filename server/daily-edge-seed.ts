import { storage } from "./storage";
import type { InsertDailyEdgeContent } from "@shared/schema";

const dailyEdgeContentData: InsertDailyEdgeContent[] = [
  // ==================== FULFILMENT ====================
  // Fulfilment - Quotes
  {
    belief: "fulfilment",
    contentType: "quote",
    title: "William James on Belief",
    content: "Act as if what you do makes a difference. It does. Be not afraid of life. Believe that life is worth living, and your belief will help create the fact.",
    source: "William James, Father of American Psychology",
    tags: ["belief", "action", "classic"],
  },
  {
    belief: "fulfilment",
    contentType: "quote",
    title: "Zig Ziglar on Helping Others",
    content: "You can have everything in life you want, if you will just help other people get what they want.",
    source: "Zig Ziglar",
    tags: ["service", "success", "classic"],
  },
  {
    belief: "fulfilment",
    contentType: "quote",
    title: "Brian Tracy on Purpose",
    content: "Successful people are always looking for opportunities to help others. Unsuccessful people are always asking, 'What's in it for me?'",
    source: "Brian Tracy",
    tags: ["service", "mindset", "purpose"],
  },
  {
    belief: "fulfilment",
    contentType: "quote",
    title: "Mary Kay on Making a Difference",
    content: "Pretend that every single person you meet has a sign around their neck that says, 'Make me feel important.' Not only will you succeed in sales, you will succeed in life.",
    source: "Mary Kay Ash",
    tags: ["empathy", "connection", "classic"],
  },

  // Fulfilment - Insights
  {
    belief: "fulfilment",
    contentType: "insight",
    title: "The Winner's Mindset",
    content: "100% of high-performing salespeople are driven by DESIRE more intensely than FEAR. Top performers want to be better than they ever thought possible. They give themselves permission to succeed rather than focusing on avoiding failure.",
    source: "The Salesperson's Secret Code",
    tags: ["mindset", "motivation", "research"],
  },
  {
    belief: "fulfilment",
    contentType: "insight",
    title: "The Fulfillment Cycle",
    content: "The more fulfilled and confident you become, the more gravitas you project, and the more control you exert over your environment. High performers constantly evaluate themselves against a personal progress goal to be the most professional, productive salesperson they can be.",
    source: "The Salesperson's Secret Code",
    tags: ["cycle", "confidence", "growth"],
  },
  {
    belief: "fulfilment",
    contentType: "insight",
    title: "The Research Finding",
    content: "From 1,000 salespeople interviewed for 90 minutes each: High performers believe in giving themselves PERMISSION to be better than they ever dreamed possible. Low performers focus on avoiding failure. Same situations, different belief systems, dramatically different results.",
    source: "The Salesperson's Secret Code",
    tags: ["research", "permission", "mindset"],
  },
  {
    belief: "fulfilment",
    contentType: "insight",
    title: "Purpose-Driven Selling",
    content: "Salespeople who connect their work to a larger purpose outperform those focused solely on commissions by 27%. When you believe you're genuinely helping customers solve problems, your authenticity becomes your greatest competitive advantage.",
    source: "Sales Psychology Research",
    tags: ["purpose", "authenticity", "research"],
  },

  // Fulfilment - Challenges
  {
    belief: "fulfilment",
    contentType: "challenge",
    title: "Permission to Succeed",
    content: "Today's Challenge: Write down one goal you've been holding back on because you're afraid of failing. Now reframe it: Instead of 'I hope I don't mess this up,' write 'I'm excited to see how good I can become at this.' Approach your next sales call with this desire-driven mindset.",
    source: "PCBancard Coaching",
    tags: ["challenge", "mindset", "action"],
  },
  {
    belief: "fulfilment",
    contentType: "challenge",
    title: "Success Visualization",
    content: "Today's Challenge: Before your first call, spend 60 seconds visualizing yourself succeeding. See the merchant nodding, asking questions, signing up. Feel the confidence of knowing you're helping their business. Desire-driven salespeople see success before they achieve it.",
    source: "PCBancard Coaching",
    tags: ["challenge", "visualization", "preparation"],
  },
  {
    belief: "fulfilment",
    contentType: "challenge",
    title: "Impact Journal",
    content: "Today's Challenge: At the end of your day, write down one specific way you helped a customer today. Not what you sold—how you helped. Building this habit reinforces the belief that your work matters and creates lasting fulfillment.",
    source: "PCBancard Coaching",
    tags: ["challenge", "reflection", "purpose"],
  },
  {
    belief: "fulfilment",
    contentType: "challenge",
    title: "The Gratitude Call",
    content: "Today's Challenge: Call one existing customer just to thank them for their business. No upsell, no pitch—just genuine appreciation. Notice how this one call transforms your mindset for the rest of the day.",
    source: "PCBancard Coaching",
    tags: ["challenge", "gratitude", "relationships"],
  },

  // Fulfilment - Iconic Stories
  {
    belief: "fulfilment",
    contentType: "iconic_story",
    title: "Erica Feidner - The Piano Matchmaker",
    content: "Erica Feidner was named one of the 10 greatest salespeople of all time by Inc. magazine. She was Steinway's top rep for a decade. Her secret? 'I don't sell pianos. I sell inspiration. When you focus on what's right for each customer, the dynamic shifts. You don't sell a product to them; they buy an experience from you.'",
    source: "Erica Feidner, Steinway",
    tags: ["iconic", "inspiration", "customer_focus"],
  },
  {
    belief: "fulfilment",
    contentType: "iconic_story",
    title: "Joe Girard - The World's Greatest Salesman",
    content: "Joe Girard holds the Guinness World Record for most cars sold in a year (1,425) and a career (13,001). His secret wasn't high-pressure tactics—it was genuine care. He sent every customer a handwritten card every month. 'I don't sell cars, I sell Joe Girard,' he said. His customers didn't just buy; they became evangelists.",
    source: "Joe Girard",
    tags: ["iconic", "relationships", "consistency"],
  },
  {
    belief: "fulfilment",
    contentType: "iconic_story",
    title: "Mary Kay Ash - Building Dreams",
    content: "Mary Kay Ash built a $3 billion empire not by focusing on cosmetics, but on people's potential. 'Everyone wants to be appreciated,' she said. Her philosophy: help others succeed, and success will follow you. She created more female millionaires than any other company in history.",
    source: "Mary Kay Ash",
    tags: ["iconic", "empowerment", "legacy"],
  },

  // Fulfilment - Journey Motivators
  {
    belief: "fulfilment",
    contentType: "journey_motivator",
    title: "Fear vs Desire",
    content: "Journey Motivator 1 (Fear): 'I must win because I fear failure.' Journey Motivator 2 (Desire): 'I want to be better than I thought I could ever be.' Research shows the optimal balance for top performers is 62% Desire and 38% Fear. The carrot is nearly twice as powerful as the stick.",
    source: "The Salesperson's Secret Code",
    tags: ["journey_motivator", "research", "balance"],
  },
  {
    belief: "fulfilment",
    contentType: "journey_motivator",
    title: "Survival vs Significance",
    content: "Journey Motivator 1 (Survival): 'I sell to pay the bills and provide for my family.' Journey Motivator 2 (Significance): 'I sell to make a real difference in my customers' lives.' Moving from survival to significance transforms selling from a job into a calling.",
    source: "The Salesperson's Secret Code",
    tags: ["journey_motivator", "purpose", "transformation"],
  },
  {
    belief: "fulfilment",
    contentType: "journey_motivator",
    title: "Transaction vs Transformation",
    content: "Journey Motivator 1 (Transaction): 'Every sale is a number—close it and move on.' Journey Motivator 2 (Transformation): 'Every sale is an opportunity to change someone's business for the better.' The highest earners see themselves as consultants, not closers.",
    source: "The Salesperson's Secret Code",
    tags: ["journey_motivator", "consulting", "impact"],
  },

  // ==================== CONTROL ====================
  // Control - Quotes
  {
    belief: "control",
    contentType: "quote",
    title: "The Accountability Principle",
    content: "When you own a problem, you can do something to change it. When you blame external factors, you've given away your power to improve.",
    source: "The Salesperson's Secret Code",
    tags: ["accountability", "power", "action"],
  },
  {
    belief: "control",
    contentType: "quote",
    title: "Grant Cardone on Responsibility",
    content: "Success is your duty, obligation, and responsibility. No one is coming to save you. The cavalry isn't coming. You have to save yourself.",
    source: "Grant Cardone",
    tags: ["responsibility", "urgency", "ownership"],
  },
  {
    belief: "control",
    contentType: "quote",
    title: "Stephen Covey on Proactivity",
    content: "I am not a product of my circumstances. I am a product of my decisions. Between stimulus and response, there is a space. In that space lies our power to choose our response.",
    source: "Stephen R. Covey",
    tags: ["choice", "proactivity", "classic"],
  },
  {
    belief: "control",
    contentType: "quote",
    title: "Jocko Willink on Extreme Ownership",
    content: "Extreme Ownership. Leaders must own everything in their world. There is no one else to blame. When things go wrong—and they always do—you must own the problem and find a solution.",
    source: "Jocko Willink",
    tags: ["ownership", "leadership", "military"],
  },

  // Control - Insights
  {
    belief: "control",
    contentType: "insight",
    title: "Owning Your Outcomes",
    content: "Top performers hold themselves accountable for success or failure. When failure comes, they don't blame the economy, their company, or marketing. They embrace it and take ownership—because when you own a problem, you can do something to change it.",
    source: "The Salesperson's Secret Code",
    tags: ["accountability", "ownership", "mindset"],
  },
  {
    belief: "control",
    contentType: "insight",
    title: "Failure as Temporary",
    content: "For high performers, failure is seen as a temporary setback on the road to inevitable success. Every mile of asphalt, every pothole, every bridge, tollgate and detour is seen as something you can control. The question isn't IF you'll succeed, but WHEN.",
    source: "The Salesperson's Secret Code",
    tags: ["failure", "persistence", "mindset"],
  },
  {
    belief: "control",
    contentType: "insight",
    title: "The Locus of Control",
    content: "Psychologists distinguish between internal and external locus of control. Salespeople with internal locus believe they shape their outcomes. Those with external locus blame circumstances. Research shows internal locus correlates with 23% higher earnings.",
    source: "Sales Psychology Research",
    tags: ["psychology", "research", "earnings"],
  },
  {
    belief: "control",
    contentType: "insight",
    title: "The 10X Input Rule",
    content: "Top performers control their inputs, not their outcomes. They know that if they make 10x the calls, 10x the follow-ups, and 10x the effort, results become predictable. Control what you can: your activity, your attitude, your preparation.",
    source: "Sales Performance Research",
    tags: ["activity", "effort", "predictability"],
  },

  // Control - Challenges
  {
    belief: "control",
    contentType: "challenge",
    title: "The Ownership Audit",
    content: "Today's Challenge: Think of your last lost deal. Write down 3 things that were 'out of your control.' Now challenge yourself: What could YOU have done differently? Better discovery? Faster follow-up? Stronger close? Shift from victim to victor by finding your controllable.",
    source: "PCBancard Coaching",
    tags: ["challenge", "reflection", "accountability"],
  },
  {
    belief: "control",
    contentType: "challenge",
    title: "The Gap Analysis",
    content: "Today's Challenge: High performers regularly evaluate where they want to be, where they are, and what the gap is. Rate yourself 1-10 on: Cold calling confidence, Objection handling, Closing skills, Product knowledge. Pick the lowest score and commit to one specific action to improve it this week.",
    source: "PCBancard Coaching",
    tags: ["challenge", "self_assessment", "improvement"],
  },
  {
    belief: "control",
    contentType: "challenge",
    title: "The Morning Ritual",
    content: "Today's Challenge: Create a non-negotiable 15-minute morning routine before your first call. It could be: review goals, visualize success, practice your pitch, or plan your day. Owning your morning means owning your day.",
    source: "PCBancard Coaching",
    tags: ["challenge", "routine", "preparation"],
  },
  {
    belief: "control",
    contentType: "challenge",
    title: "The No-Excuse Day",
    content: "Today's Challenge: For the next 8 hours, catch yourself every time you're about to blame something external. Replace every 'because of...' with 'I could have...' Log each instance. Awareness is the first step to control.",
    source: "PCBancard Coaching",
    tags: ["challenge", "awareness", "accountability"],
  },

  // Control - Iconic Stories
  {
    belief: "control",
    contentType: "iconic_story",
    title: "Chuck Pol - Delivering on Promises",
    content: "Chuck Pol, former Americas President at Vodafone, describes high performers: 'They're available to the client, deliver on promises, listen effectively, and always do their homework. They take the right people into meetings, don't pretend to be somebody they're not, and follow up, follow up, follow up!'",
    source: "Chuck Pol, Vodafone",
    tags: ["iconic", "discipline", "follow_through"],
  },
  {
    belief: "control",
    contentType: "iconic_story",
    title: "Grant Cardone - No Plan B",
    content: "Grant Cardone went from broke and addicted at 25 to building a $4 billion real estate empire. His philosophy: 'Burn the boats. There is no Plan B. That Plan B distracts you from Plan A.' He took complete ownership of his life—no excuses, no backup plans, just relentless execution.",
    source: "Grant Cardone",
    tags: ["iconic", "commitment", "execution"],
  },
  {
    belief: "control",
    contentType: "iconic_story",
    title: "Tom Hopkins - The Turnaround",
    content: "Tom Hopkins failed his first 10 months in real estate, earning just $42/month. Instead of quitting, he invested his last $150 in a sales training seminar. He took control, mastered his craft, and became the #1 residential real estate agent in America, earning over $1 million per year.",
    source: "Tom Hopkins",
    tags: ["iconic", "investment", "mastery"],
  },

  // Control - Journey Motivators
  {
    belief: "control",
    contentType: "journey_motivator",
    title: "Internal vs External Locus",
    content: "High performers have an Internal Locus of Control—they believe they shape their own destiny. Low performers have an External Locus—they attribute results to luck, timing, or circumstances beyond their control. The difference? Top sellers take action; others make excuses.",
    source: "The Salesperson's Secret Code",
    tags: ["journey_motivator", "accountability", "psychology"],
  },
  {
    belief: "control",
    contentType: "journey_motivator",
    title: "Reactive vs Proactive",
    content: "Journey Motivator 1 (Reactive): 'I respond to what the market gives me.' Journey Motivator 2 (Proactive): 'I create the opportunities I need.' Proactive sellers don't wait for leads—they generate them. They don't wait for training—they seek it. They own their growth.",
    source: "The Salesperson's Secret Code",
    tags: ["journey_motivator", "initiative", "growth"],
  },
  {
    belief: "control",
    contentType: "journey_motivator",
    title: "Victim vs Victor",
    content: "Journey Motivator 1 (Victim): 'The economy is tough, our pricing is high, leads are bad.' Journey Motivator 2 (Victor): 'In any market, someone is winning. Why not me?' Victors find solutions while victims find excuses.",
    source: "The Salesperson's Secret Code",
    tags: ["journey_motivator", "mindset", "solutions"],
  },

  // ==================== RESILIENCE ====================
  // Resilience - Quotes
  {
    belief: "resilience",
    contentType: "quote",
    title: "Napoleon on Endurance",
    content: "The first virtue in a soldier is endurance of fatigue; courage is only the second virtue.",
    source: "Napoleon Bonaparte",
    tags: ["endurance", "military", "classic"],
  },
  {
    belief: "resilience",
    contentType: "quote",
    title: "Winston Churchill on Persistence",
    content: "Success is not final, failure is not fatal: it is the courage to continue that counts. Never, never, never give up.",
    source: "Winston Churchill",
    tags: ["persistence", "courage", "classic"],
  },
  {
    belief: "resilience",
    contentType: "quote",
    title: "Michael Jordan on Failure",
    content: "I've missed more than 9,000 shots in my career. I've lost almost 300 games. 26 times I've been trusted to take the game-winning shot and missed. I've failed over and over again in my life. And that is why I succeed.",
    source: "Michael Jordan",
    tags: ["failure", "success", "sports"],
  },
  {
    belief: "resilience",
    contentType: "quote",
    title: "The Japanese Proverb",
    content: "Fall seven times, stand up eight. Nana korobi ya oki.",
    source: "Japanese Proverb",
    tags: ["persistence", "wisdom", "classic"],
  },

  // Resilience - Insights
  {
    belief: "resilience",
    contentType: "insight",
    title: "The Truth About Stress",
    content: "Stress is one of the most misunderstood concepts in sales. Some stress is essential and vital to growth. It gives you the energy to rise to challenges. The culprit isn't excessive stress—it's insufficient recovery. Stress is the stimulus for growth; growth occurs during recovery.",
    source: "The Salesperson's Secret Code",
    tags: ["stress", "growth", "recovery"],
  },
  {
    belief: "resilience",
    contentType: "insight",
    title: "The Muscle Analogy",
    content: "Like a muscle that grows after exercise, or a chunk of coal that gains value under pressure, resilient salespeople face whatever the world throws at them, convert stress to positive energy, and get busy shaping their own destiny. Every rejection is a rep that makes you stronger.",
    source: "The Salesperson's Secret Code",
    tags: ["growth", "metaphor", "strength"],
  },
  {
    belief: "resilience",
    contentType: "insight",
    title: "The 78% Statistic",
    content: "78% of workers feel maxed out—unable to handle one more challenge on top of what they're already facing. But here's what separates top performers: They've mastered the recovery cycle. They don't work harder; they recover smarter.",
    source: "The Salesperson's Secret Code",
    tags: ["research", "burnout", "recovery"],
  },
  {
    belief: "resilience",
    contentType: "insight",
    title: "Rejection is Redirection",
    content: "Studies show top salespeople face rejection at the same rate as average performers. The difference? They interpret rejection as information, not identity. A 'no' tells you something about fit, timing, or approach—it says nothing about your worth.",
    source: "Sales Psychology Research",
    tags: ["rejection", "mindset", "interpretation"],
  },

  // Resilience - Challenges
  {
    belief: "resilience",
    contentType: "challenge",
    title: "Recovery Ritual",
    content: "Today's Challenge: Physical fatigue erodes cognitive, emotional, and spiritual strength. After your hardest sales block today, take a deliberate 15-minute recovery break. No phone, no email. Walk, breathe, or simply sit quietly. Resilience is built in the recovery, not the grind.",
    source: "PCBancard Coaching",
    tags: ["challenge", "recovery", "self_care"],
  },
  {
    belief: "resilience",
    contentType: "challenge",
    title: "Rejection Reframe",
    content: "Today's Challenge: After your next rejection, instead of dwelling on what went wrong, ask yourself: 'What did I learn? What will I do differently next time?' Write it down. Top performers see rejection as data, not defeat. Collect insights, not wounds.",
    source: "PCBancard Coaching",
    tags: ["challenge", "rejection", "learning"],
  },
  {
    belief: "resilience",
    contentType: "challenge",
    title: "The Cold Call Commitment",
    content: "Today's Challenge: Make 5 more calls than you normally would today. Not tomorrow—today. Each additional 'no' you hear builds your rejection muscle. By the end of the day, you'll realize you can handle more than you thought.",
    source: "PCBancard Coaching",
    tags: ["challenge", "activity", "growth"],
  },
  {
    belief: "resilience",
    contentType: "challenge",
    title: "Failure Celebration",
    content: "Today's Challenge: At the end of the day, celebrate your biggest failure. Share it with a colleague or write it down with the lesson learned. Reframing failure as learning accelerates growth and builds mental toughness.",
    source: "PCBancard Coaching",
    tags: ["challenge", "mindset", "learning"],
  },

  // Resilience - Iconic Stories
  {
    belief: "resilience",
    contentType: "iconic_story",
    title: "Colleen Schuller - Fast Forward the Tape",
    content: "Colleen Schuller, VP at GlaxoSmithKline, asks: 'Fast-forward the tape five years and really think about what you want to be known for. Are you doing your job because you love it? What mark do you want to make? Be a learner as well as a role model. When you're your authentic self, you will always be more successful.'",
    source: "Colleen Schuller, GSK",
    tags: ["iconic", "vision", "authenticity"],
  },
  {
    belief: "resilience",
    contentType: "iconic_story",
    title: "Colonel Sanders - Never Too Late",
    content: "Colonel Sanders was rejected 1,009 times before a restaurant accepted his fried chicken recipe. He was 62 years old and living on Social Security when he started. His resilience lesson: 'I made a resolve then that I was going to amount to something if I could. And no hours, nor amount of labor, nor amount of money would deter me.'",
    source: "Colonel Harland Sanders",
    tags: ["iconic", "persistence", "late_success"],
  },
  {
    belief: "resilience",
    contentType: "iconic_story",
    title: "Sylvester Stallone - Rocky Belief",
    content: "Stallone was rejected by every major studio—over 1,500 times. He was broke, sold his dog for $25, and slept at bus stations. But he refused to sell his Rocky script without starring in it. The movie won Best Picture and launched a $4 billion franchise. He bought his dog back for $15,000.",
    source: "Sylvester Stallone",
    tags: ["iconic", "persistence", "vision"],
  },

  // Resilience - Journey Motivators
  {
    belief: "resilience",
    contentType: "journey_motivator",
    title: "Work Hard vs Work Smart",
    content: "Journey Motivator 1 (Work Hard): 'In the face of challenge, I work even harder and win through.' Journey Motivator 2 (Work Smart): 'I use moments of adversity to find new and creative ways to achieve goals.' Top performers lean toward working smarter, not just harder.",
    source: "The Salesperson's Secret Code",
    tags: ["journey_motivator", "strategy", "efficiency"],
  },
  {
    belief: "resilience",
    contentType: "journey_motivator",
    title: "Avoidance vs Confrontation",
    content: "Journey Motivator 1 (Avoidance): 'I protect myself from difficult situations.' Journey Motivator 2 (Confrontation): 'I actively seek out challenges because that's where growth happens.' Top performers don't avoid hard calls—they make them first.",
    source: "The Salesperson's Secret Code",
    tags: ["journey_motivator", "courage", "growth"],
  },
  {
    belief: "resilience",
    contentType: "journey_motivator",
    title: "Fragile vs Antifragile",
    content: "Journey Motivator 1 (Fragile): 'Setbacks weaken me and my confidence.' Journey Motivator 2 (Antifragile): 'Setbacks make me stronger and more determined.' Like bones that strengthen under stress, antifragile salespeople thrive on challenge.",
    source: "The Salesperson's Secret Code",
    tags: ["journey_motivator", "antifragile", "strength"],
  },

  // ==================== INFLUENCE ====================
  // Influence - Quotes
  {
    belief: "influence",
    contentType: "quote",
    title: "Politics is Part of the Game",
    content: "You will always encounter politics on the job. People will always be jockeying to be noticed, gain allies, build a power base. It requires extra effort to navigate this, which is why resilience provides such a vital foundation for influence.",
    source: "The Salesperson's Secret Code",
    tags: ["politics", "navigation", "reality"],
  },
  {
    belief: "influence",
    contentType: "quote",
    title: "Dale Carnegie on Influence",
    content: "You can make more friends in two months by becoming interested in other people than you can in two years by trying to get other people interested in you.",
    source: "Dale Carnegie",
    tags: ["interest", "relationships", "classic"],
  },
  {
    belief: "influence",
    contentType: "quote",
    title: "Robert Cialdini on Reciprocity",
    content: "The rule says that we should try to repay, in kind, what another person has provided us. Give first—value, insight, help—and influence naturally follows.",
    source: "Robert Cialdini",
    tags: ["reciprocity", "giving", "psychology"],
  },
  {
    belief: "influence",
    contentType: "quote",
    title: "Jeffrey Gitomer on Trust",
    content: "People don't buy for logical reasons. They buy for emotional reasons. All things being equal, people want to do business with their friends. All things being not so equal, people STILL want to do business with their friends.",
    source: "Jeffrey Gitomer",
    tags: ["trust", "emotion", "relationships"],
  },

  // Influence - Insights
  {
    belief: "influence",
    contentType: "insight",
    title: "The Inner Circle",
    content: "Inside every business are people with influence over decisions. They pull strings, are at the center of informal networks. They join meetings late without criticism, others defer to them saying 'What do you think?' They get resources when others get none. Finding them is your key to winning.",
    source: "The Salesperson's Secret Code",
    tags: ["networking", "decision_makers", "strategy"],
  },
  {
    belief: "influence",
    contentType: "insight",
    title: "Land and Expand",
    content: "Once you're through the gate, connect to multiple people and plant your flag. Keep prospecting. Make connections. As you climb the 'mountain of influence,' make sure you have plenty of anchor points. If one mooring comes loose, the others will catch you.",
    source: "The Salesperson's Secret Code",
    tags: ["strategy", "networking", "relationships"],
  },
  {
    belief: "influence",
    contentType: "insight",
    title: "The Liking Principle",
    content: "People are more likely to say yes to those they like. Similarity, compliments, cooperation, and physical attractiveness all increase liking. But the most powerful: genuine interest in their world. Ask questions, listen deeply, remember details.",
    source: "Robert Cialdini Research",
    tags: ["liking", "psychology", "connection"],
  },
  {
    belief: "influence",
    contentType: "insight",
    title: "Social Proof in Sales",
    content: "When uncertain, people look to others for guidance. That's why testimonials, case studies, and references are so powerful. 'Other businesses like yours have seen...' reduces risk and builds confidence in buying decisions.",
    source: "Robert Cialdini Research",
    tags: ["social_proof", "testimonials", "psychology"],
  },

  // Influence - Challenges
  {
    belief: "influence",
    contentType: "challenge",
    title: "The Influence Test",
    content: "Today's Challenge: Test if a contact has real influence. Ask for something only a person of influence can deliver—an introduction, an internal document, a meeting with the decision maker. Low performers worry about 'pushing their luck.' Top sellers make their own luck by testing early.",
    source: "PCBancard Coaching",
    tags: ["challenge", "testing", "action"],
  },
  {
    belief: "influence",
    contentType: "challenge",
    title: "Be Their Bridge",
    content: "Today's Challenge: Position yourself as the bridge between where your prospect is today and where they want to be tomorrow. In your next conversation, ask: 'Where do you want your business to be in 12 months?' Then show how you can help them get there. You become indispensable.",
    source: "PCBancard Coaching",
    tags: ["challenge", "positioning", "value"],
  },
  {
    belief: "influence",
    contentType: "challenge",
    title: "The Referral Ask",
    content: "Today's Challenge: Ask one satisfied customer for a specific referral. Not 'Do you know anyone?' but 'Who's the best restaurant owner you know who might benefit from lower processing fees?' Specific asks get specific results.",
    source: "PCBancard Coaching",
    tags: ["challenge", "referrals", "specificity"],
  },
  {
    belief: "influence",
    contentType: "challenge",
    title: "The LinkedIn Connection",
    content: "Today's Challenge: Before your next meeting, find 3 mutual connections on LinkedIn. Mention one naturally in conversation: 'I see you know Sarah from the Chamber—she's great!' Shared connections build instant rapport and credibility.",
    source: "PCBancard Coaching",
    tags: ["challenge", "preparation", "rapport"],
  },

  // Influence - Iconic Stories
  {
    belief: "influence",
    contentType: "iconic_story",
    title: "Erica Feidner - Integrity as Influence",
    content: "Erica Feidner: 'If I have several pianos that are a close fit, but not the perfect one, I'll turn down the opportunity and ask for time to find the exact solution. Customers are always delighted. The point is to do the right thing, every single time. You build a personal reputation, fiercely defend it, and customers won't deal with anyone but you.'",
    source: "Erica Feidner, Steinway",
    tags: ["iconic", "integrity", "reputation"],
  },
  {
    belief: "influence",
    contentType: "iconic_story",
    title: "Harvey Mackay - The Rolodex King",
    content: "Harvey Mackay built a $100M envelope company through pure relationship mastery. His 'Mackay 66' profile collected 66 facts about each customer—from their spouse's birthday to their favorite restaurant. 'People don't care how much you know until they know how much you care.'",
    source: "Harvey Mackay",
    tags: ["iconic", "relationships", "detail"],
  },
  {
    belief: "influence",
    contentType: "iconic_story",
    title: "Chris Voss - The FBI Negotiator",
    content: "Former FBI hostage negotiator Chris Voss discovered that tactical empathy—understanding feelings without agreeing with them—is the key to influence. His technique of 'labeling' emotions ('It sounds like you're frustrated with your current provider...') creates instant connection and lowers defenses.",
    source: "Chris Voss, Never Split the Difference",
    tags: ["iconic", "empathy", "negotiation"],
  },

  // Influence - Journey Motivators
  {
    belief: "influence",
    contentType: "journey_motivator",
    title: "Gorilla vs Guerrilla",
    content: "Journey Motivator 1 (Gorilla): 'The stronger I am, the more I can influence'—using title, brand power, authority. Journey Motivator 2 (Guerrilla): 'The more flexible I am, the more I can influence'—through networking, contribution, and building allies at all levels. Top performers are guerrillas.",
    source: "The Salesperson's Secret Code",
    tags: ["journey_motivator", "strategy", "flexibility"],
  },
  {
    belief: "influence",
    contentType: "journey_motivator",
    title: "Push vs Pull",
    content: "Journey Motivator 1 (Push): 'I influence through assertive persuasion and persistence.' Journey Motivator 2 (Pull): 'I influence by becoming so valuable they can't ignore me.' The best sellers combine both, knowing when to push and when to attract.",
    source: "The Salesperson's Secret Code",
    tags: ["journey_motivator", "strategy", "value"],
  },
  {
    belief: "influence",
    contentType: "journey_motivator",
    title: "Transactional vs Relational",
    content: "Journey Motivator 1 (Transactional): 'Each deal is independent—close and move on.' Journey Motivator 2 (Relational): 'Each deal is a stepping stone to a long-term partnership.' Relational sellers earn 3x more lifetime value from customers.",
    source: "The Salesperson's Secret Code",
    tags: ["journey_motivator", "relationships", "lifetime_value"],
  },

  // ==================== COMMUNICATION ====================
  // Communication - Quotes
  {
    belief: "communication",
    contentType: "quote",
    title: "Louis Jordan on Communication",
    content: "Communication is the primary utensil in the process of selling.",
    source: "Louis Jordan, Deloitte & KPMG",
    tags: ["quote", "fundamentals"],
  },
  {
    belief: "communication",
    contentType: "quote",
    title: "Peter Drucker on Listening",
    content: "The most important thing in communication is hearing what isn't said.",
    source: "Peter Drucker",
    tags: ["listening", "insight", "classic"],
  },
  {
    belief: "communication",
    contentType: "quote",
    title: "Stephen Covey on Understanding",
    content: "Most people do not listen with the intent to understand; they listen with the intent to reply. Seek first to understand, then to be understood.",
    source: "Stephen R. Covey",
    tags: ["listening", "empathy", "classic"],
  },
  {
    belief: "communication",
    contentType: "quote",
    title: "Ernest Hemingway on Brevity",
    content: "The first draft of anything is garbage. Write drunk, edit sober. Say more with less.",
    source: "Ernest Hemingway",
    tags: ["brevity", "clarity", "writing"],
  },

  // Communication - Insights
  {
    belief: "communication",
    contentType: "insight",
    title: "Aristotle's Persuasion Chain",
    content: "Great communication uses three elements: ETHOS (credibility—why should they listen?), PATHOS (emotion—why should they care?), and LOGOS (logic—why should they believe?). Top sellers say: 'You sell to the gut, the heart, then the brain—in that order.'",
    source: "The Salesperson's Secret Code",
    tags: ["persuasion", "communication", "aristotle"],
  },
  {
    belief: "communication",
    contentType: "insight",
    title: "The Chameleon Effect",
    content: "High performers recognize that communication is never one-size-fits-all. They are flexible, chameleon-like. They believe they have a duty to help others understand, to enable questions, to generate dialogue. They adapt to each customer's style while remaining authentic.",
    source: "The Salesperson's Secret Code",
    tags: ["adaptability", "dialogue", "style"],
  },
  {
    belief: "communication",
    contentType: "insight",
    title: "Ethos, Pathos, Logos",
    content: "ETHOS: Build credibility and authority—'Why should they listen?' PATHOS: Create emotional connection—'Why should they care?' LOGOS: Present logical proof—'Why should they believe?' No sales conversation is complete without all three.",
    source: "The Salesperson's Secret Code / Aristotle",
    tags: ["framework", "persuasion", "complete"],
  },
  {
    belief: "communication",
    contentType: "insight",
    title: "The 7-38-55 Rule",
    content: "Research shows communication is 7% words, 38% tone, and 55% body language. In phone sales, your voice carries 93% of the message. Smile when you dial—customers can hear it. Stand when you close—your energy changes.",
    source: "Albert Mehrabian Research",
    tags: ["research", "tone", "body_language"],
  },

  // Communication - Challenges
  {
    belief: "communication",
    contentType: "challenge",
    title: "The Three-Part Story",
    content: "Today's Challenge: Structure your next pitch as a three-part story: (1) An attention-grabbing headline, (2) A reason it matters to THEM, (3) A clear call to action. Test it: If you can't say it in 200 characters, simplify. Speed and clarity cut through the noise.",
    source: "PCBancard Coaching",
    tags: ["challenge", "structure", "clarity"],
  },
  {
    belief: "communication",
    contentType: "challenge",
    title: "Short Exchanges Over Long Meetings",
    content: "Today's Challenge: Instead of planning one long follow-up meeting, schedule three shorter check-ins. Stay front-of-mind with brief, valuable touches. Send a relevant article, share a quick insight, ask one thoughtful question. Continuous dialogue beats occasional monologue.",
    source: "PCBancard Coaching",
    tags: ["challenge", "follow_up", "frequency"],
  },
  {
    belief: "communication",
    contentType: "challenge",
    title: "The Silence Test",
    content: "Today's Challenge: After asking a question, count to 5 before speaking again. Most salespeople fill silence with more talking. Resist. The prospect who's thinking is the prospect who's selling themselves. Silence is your most powerful closing tool.",
    source: "PCBancard Coaching",
    tags: ["challenge", "silence", "listening"],
  },
  {
    belief: "communication",
    contentType: "challenge",
    title: "The Name Game",
    content: "Today's Challenge: Use your prospect's name 3 times during your next call—once at the start, once in the middle, and once at the close. Not more, not less. A person's name is the sweetest sound to them. Use it intentionally.",
    source: "PCBancard Coaching",
    tags: ["challenge", "personalization", "rapport"],
  },

  // Communication - Iconic Stories
  {
    belief: "communication",
    contentType: "iconic_story",
    title: "Chuck Pol - The Power of Listening",
    content: "Chuck Pol emphasizes that high performers 'listen effectively' and are 'always prepared because they do their homework.' They adjust their style while staying true to themselves. Great communication isn't just talking—it's understanding.",
    source: "Chuck Pol, Vodafone",
    tags: ["iconic", "listening", "preparation"],
  },
  {
    belief: "communication",
    contentType: "iconic_story",
    title: "Oprah Winfrey - Master of Connection",
    content: "Oprah interviewed over 37,000 guests. Her secret? 'I learned that when people finish speaking, they want to know: Did you hear me? Did you understand what I said? Did what I say matter?' She validates before responding. That's communication mastery.",
    source: "Oprah Winfrey",
    tags: ["iconic", "listening", "validation"],
  },
  {
    belief: "communication",
    contentType: "iconic_story",
    title: "Steve Jobs - Simplicity Sells",
    content: "Steve Jobs was obsessed with simplicity. 'Simple can be harder than complex: You have to work hard to get your thinking clean to make it simple.' His presentations used few words, powerful images, and one clear message. The iPhone announcement: 'An iPod, a phone, an internet communicator.' Three things, one device.",
    source: "Steve Jobs",
    tags: ["iconic", "simplicity", "clarity"],
  },

  // Communication - Journey Motivators
  {
    belief: "communication",
    contentType: "journey_motivator",
    title: "Lightning vs Thunder",
    content: "Journey Motivator 1 (Lightning): 'Great communication is about getting your message across clearly and succinctly.' Journey Motivator 2 (Thunder): 'Great communication is about developing continuous and meaningful dialogue.' You need both to create a revenue storm.",
    source: "The Salesperson's Secret Code",
    tags: ["journey_motivator", "style", "balance"],
  },
  {
    belief: "communication",
    contentType: "journey_motivator",
    title: "Telling vs Asking",
    content: "Journey Motivator 1 (Telling): 'I communicate by sharing my expertise and solutions.' Journey Motivator 2 (Asking): 'I communicate by asking great questions and listening deeply.' Top performers ask twice as many questions as average sellers.",
    source: "The Salesperson's Secret Code",
    tags: ["journey_motivator", "questions", "listening"],
  },
  {
    belief: "communication",
    contentType: "journey_motivator",
    title: "Formal vs Casual",
    content: "Journey Motivator 1 (Formal): 'Professional communication builds credibility and respect.' Journey Motivator 2 (Casual): 'Relaxed communication builds rapport and trust.' The key is reading your audience and flexing your style. Match their energy, then lead.",
    source: "The Salesperson's Secret Code",
    tags: ["journey_motivator", "adaptability", "style"],
  },
];

export async function seedDailyEdgeContent(): Promise<void> {
  console.log("Checking if Daily Edge content needs to be seeded...");
  
  try {
    const existingContent = await storage.getDailyEdgeContent();
    
    if (existingContent.length > 0) {
      console.log(`Daily Edge content already exists (${existingContent.length} items). Skipping seed.`);
      return;
    }
    
    console.log(`Seeding ${dailyEdgeContentData.length} Daily Edge content items...`);
    
    const seededContent = await storage.seedDailyEdgeContent(dailyEdgeContentData);
    
    console.log(`Successfully seeded ${seededContent.length} Daily Edge content items.`);
    
    const beliefCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    
    for (const item of seededContent) {
      beliefCounts[item.belief] = (beliefCounts[item.belief] || 0) + 1;
      typeCounts[item.contentType] = (typeCounts[item.contentType] || 0) + 1;
    }
    
    console.log("Content by belief:", beliefCounts);
    console.log("Content by type:", typeCounts);
  } catch (error) {
    console.error("Error seeding Daily Edge content:", error);
    throw error;
  }
}

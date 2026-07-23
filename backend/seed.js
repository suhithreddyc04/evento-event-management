// Populates the `events` collection with starter data.
// Run once with: node seed.js
const dns = require('dns');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const EventModel = require('./models/Event');

dotenv.config();

// Windows' default resolver can fail SRV lookups needed by mongodb+srv:// URIs.
dns.setServers(['8.8.8.8', '8.8.4.4']);

const events = [
    {
        name: 'Destination Wedding at Beach',
        description: 'A beautiful wedding with elegant decorations.',
        imageUrl: '/images/edimages/dest.jpeg',
        category: 'wedding',
        details: 'This wedding is held at a stunning beach location, with an intimate ceremony followed by a celebration under the stars.',
        activities: 'Beach games, sandcastle building, sunset photography sessions.',
        decorations: 'Elegant floral arrangements, beach-themed decor, fairy lights.',
        games: 'Beach volleyball, tug of war, sandcastle competitions.',
    },
    {
        name: 'Royal Palace Wedding',
        description: 'A grand wedding in a majestic palace setting.',
        imageUrl: '/images/edimages/royal.jpeg',
        category: 'wedding',
        details: 'Experience the luxury of a palace wedding, complete with regal decorations, fine dining, and a royal atmosphere.',
        activities: 'Horse carriage ride, royal banquet, live classical music.',
        decorations: 'Gold and royal blue color scheme, crystal chandeliers, velvet drapes.',
        games: 'Ballroom dancing, royal trivia quiz.',
    },
    {
        name: 'Garden Wedding Reception',
        description: 'An intimate outdoor wedding reception.',
        imageUrl: '/images/edimages/garden.jpeg',
        category: 'wedding',
        details: 'A cozy, nature-filled reception surrounded by blooming gardens and string lights.',
        activities: 'Lawn games, live acoustic music, garden photo walk.',
        decorations: 'Wildflower centerpieces, wooden arches, pastel drapery.',
        games: 'Croquet, giant Jenga, bocce ball.',
    },
    {
        name: 'Corporate Conference at Company',
        description: 'A professional conference for corporate networking and learning.',
        imageUrl: '/images/ce1.jpg',
        category: 'corporate',
        details: 'A full-day conference with keynote speakers, breakout sessions, and networking lunches.',
        activities: 'Keynote talks, panel discussions, networking mixers.',
        decorations: 'Branded backdrops, modern stage lighting, digital signage.',
        games: 'Icebreaker trivia, team networking bingo.',
    },
    {
        name: 'Team-Building Workshop',
        description: 'Enhance teamwork and productivity with engaging workshops.',
        imageUrl: '/images/edimages/work.jpeg',
        category: 'corporate',
        details: 'Hands-on workshops designed to strengthen collaboration and communication across teams.',
        activities: 'Group problem-solving challenges, workshop breakout sessions.',
        decorations: 'Minimalist workspace setup, whiteboards, motivational banners.',
        games: 'Escape room challenge, trust-building exercises.',
    },
    {
        name: 'Annual General Meeting',
        description: 'Host your AGM with seamless organization and support.',
        imageUrl: '/images/edimages/anual.jpeg',
        category: 'corporate',
        details: 'A formal AGM setup with presentation support, voting logistics, and stakeholder catering.',
        activities: 'Board presentations, shareholder Q&A, formal voting session.',
        decorations: 'Corporate stage backdrop, formal seating rows, podium setup.',
        games: 'N/A',
    },
    {
        name: 'Birthday Party at Cafe',
        description: 'A fun-filled birthday celebration with games and entertainment.',
        imageUrl: '/images/edimages/cafe.jpeg',
        category: 'birthday',
        details: 'A cozy cafe transformed into a celebration space with music, snacks, and balloons.',
        activities: 'Live music, cake-cutting ceremony, photo booth.',
        decorations: 'Balloon arches, fairy lights, themed table settings.',
        games: 'Musical chairs, trivia quiz, gift exchange.',
    },
    {
        name: 'Poolside Birthday Bash',
        description: 'Celebrate with a splash at a poolside party.',
        imageUrl: '/images/edimages/pool.jpeg',
        category: 'birthday',
        details: 'A sunny poolside celebration with music, drinks, and water games for all ages.',
        activities: 'Pool games, DJ music, poolside barbecue.',
        decorations: 'Tropical decor, floating lights, colorful cabanas.',
        games: 'Pool volleyball, floating relay races.',
    },
    {
        name: 'Kids Birthday Wonderland',
        description: 'A magical birthday experience for kids.',
        imageUrl: '/images/edimages/wonderland.jpeg',
        category: 'birthday',
        details: 'A whimsical, themed party designed to delight kids with entertainment and activities.',
        activities: 'Magic show, face painting, storytelling corner.',
        decorations: 'Fairy-tale themed props, colorful balloons, castle backdrop.',
        games: 'Treasure hunt, pin the tail, balloon pop.',
    },
    {
        name: 'Family Reunion at Resorts',
        description: 'A heartwarming family reunion with activities for everyone.',
        imageUrl: '/images/g1.jpg',
        category: 'reunion',
        details: 'A relaxing resort getaway bringing extended family together for quality time.',
        activities: 'Group excursions, poolside gatherings, family game night.',
        decorations: 'Resort-style decor, family photo wall, welcome banners.',
        games: 'Family trivia, relay races, board game tournament.',
    },
    {
        name: 'Rustic Ranch Get-Together',
        description: 'A countryside reunion with rustic charm.',
        imageUrl: '/images/g2.jpg',
        category: 'reunion',
        details: 'A warm, rustic gathering set on a countryside ranch with bonfire and barn-style dining.',
        activities: 'Bonfire storytelling, hayrides, line dancing.',
        decorations: 'Wooden barn decor, string lights, mason jar centerpieces.',
        games: 'Horseshoe toss, campfire sing-along, barn dance-off.',
    },
    {
        name: 'Luxury Villa Reunion',
        description: 'Reunite in style at a luxurious villa.',
        imageUrl: '/images/edimages/villa.jpeg',
        category: 'reunion',
        details: 'An upscale reunion at a private villa featuring fine dining and curated entertainment.',
        activities: 'Private chef dinner, villa pool lounging, live band.',
        decorations: 'Elegant table settings, ambient lighting, floral centerpieces.',
        games: 'Wine tasting quiz, poolside charades.',
    },
];

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    await EventModel.deleteMany({});
    await EventModel.insertMany(events);

    console.log(`Seeded ${events.length} events`);
    await mongoose.disconnect();
}

seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});

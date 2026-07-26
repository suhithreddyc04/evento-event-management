// Single source of truth for event categories. Add a new category here and
// it automatically shows up in the admin form, the category browse grid,
// and the home page previews. `imageUrl` is optional — categories without
// a photo yet fall back to an icon tile (see `bi-*` classes from
// bootstrap-icons, already loaded in index.html).
export const CATEGORIES = [
    {
        id: 'wedding',
        name: 'Weddings',
        tagline: 'Say "I do" in style',
        description: 'Celebrate your love with memorable weddings at exquisite venues, tailored for your perfect day.',
        imageUrl: '/images/m2.jpg',
    },
    {
        id: 'corporate',
        name: 'Corporate Events',
        tagline: 'Impress your team & clients',
        description: 'Host professional and impactful corporate events with state-of-the-art facilities and services.',
        imageUrl: '/images/ce2.jpg',
    },
    {
        id: 'birthday',
        name: 'Birthdays',
        tagline: 'Celebrations they will remember',
        description: 'Make birthdays unforgettable with vibrant themes, fun activities, and delightful surprises.',
        imageUrl: '/images/b2.jpg',
    },
    {
        id: 'reunion',
        name: 'Reunions',
        tagline: 'Bring everyone back together',
        description: 'Reconnect with loved ones in heartwarming family reunions at beautiful destinations.',
        imageUrl: '/images/g2.jpg',
    },
];

export const getCategory = (id) => CATEGORIES.find((category) => category.id === id);

export const getCategoryName = (id) => getCategory(id)?.name || id;

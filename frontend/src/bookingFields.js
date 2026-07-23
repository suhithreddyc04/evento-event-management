// Category-specific questions shown on the booking form, keyed by Event.category.
export const CATEGORY_FIELDS = {
    wedding: [
        { name: 'guestCount', label: 'Expected Guest Count', type: 'number' },
        { name: 'venuePreference', label: 'Venue Preference', type: 'select', options: ['Indoor', 'Outdoor', 'Beach', 'Palace'] },
        { name: 'theme', label: 'Theme / Color Scheme', type: 'text' },
    ],
    corporate: [
        { name: 'attendeeCount', label: 'Number of Attendees', type: 'number' },
        { name: 'avEquipment', label: 'AV Equipment Needed', type: 'select', options: ['Yes', 'No'] },
        { name: 'cateringRequired', label: 'Catering Required', type: 'select', options: ['Yes', 'No'] },
    ],
    birthday: [
        { name: 'ageGroup', label: 'Age / Age Group', type: 'text' },
        { name: 'theme', label: 'Party Theme', type: 'text' },
        { name: 'cakeRequired', label: 'Cake Required', type: 'select', options: ['Yes', 'No'] },
    ],
    reunion: [
        { name: 'guestCount', label: 'Expected Number of Guests', type: 'number' },
        { name: 'venuePreference', label: 'Venue Preference', type: 'select', options: ['Indoor', 'Outdoor', 'Resort', 'Ranch'] },
    ],
};

export const getCategoryFields = (category) => CATEGORY_FIELDS[category] || [];

// What the "name" field on the booking form actually means for each category.
const NAME_LABELS = {
    wedding: "Couple's Names",
    corporate: 'Company / Event Name',
    birthday: "Birthday Person's Name",
    reunion: 'Family / Group Name',
};

export const getNameLabel = (category) => NAME_LABELS[category] || 'Name';

const mongoose = require('mongoose');

const FormDataSchema = new mongoose.Schema({
    name : String,
    email: String,
    password: String,
    googleId: String,
    avatarUrl: String,
    isAdmin: { type: Boolean, default: false },
    // 'manager' can manage the events assigned to them (see Event.manager) but,
    // unlike isAdmin, has no platform-wide access. isAdmin always outranks this.
    role: { type: String, enum: ['client', 'manager'], default: 'client' },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    resetPasswordToken: String,
    resetPasswordExpires: Date,
})

const FormDataModel = mongoose.model('log_reg_form', FormDataSchema);

module.exports = FormDataModel;

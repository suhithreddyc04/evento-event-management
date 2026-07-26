const FormDataModel = require('../models/FormData');

const getFavoriteIdSet = (userId) => {
    if (!userId) return Promise.resolve(new Set());

    return FormDataModel.findById(userId).select('favorites')
        .then(user => new Set((user?.favorites || []).map((id) => id.toString())));
};

module.exports = { getFavoriteIdSet };

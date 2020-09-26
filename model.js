const mongoose = require('mongoose')

const ModelSchema = new mongoose.Schema({
  _id: { type: String },
  id: { type: String},
  customer: {type: Object},
});

ModelSchema.pre('save', function (next) {
    this._id = this.get('id');
    next();
});
const Model = mongoose.model('primary-transactions', ModelSchema);
module.exports = {Model, ModelSchema};

const mongoose = require('mongoose')
const Schema = mongoose.Schema

let Plan = new Schema(
  {
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    featuredTitle: {
      type: String,
    },
    featuredLogo: {
      type: String,
    },
    featuredGradientColor: {
      type: String,
    },
    subPlans: {
      type: [Schema.Types.ObjectId],
      ref: 'Plan',
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
    },
    planType: {
      type: String,
      default: 'custom',
    },
    displayGraphicImageUrl: {
      type: String,
    },
    trailerVideoURL: {
      type: String,
    },
    trailerPublicID: {
      type: String,
    },
    headerImageUrl: {
      type: String,
    },
    headerPublicID: {
      type: String,
    },
    wideGraphicUrl: {
      type: String,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    assignments: {
      type: [Schema.Types.ObjectId],
      ref: 'Assignment',
    },
    isRemoved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
)

const transform = (doc, ret, options) => {
  delete ret.__v
  ret.id = ret._id.toString()
  delete ret._id
}

Plan.set('toObject', {
  virtuals: true,
  transform: transform,
})

Plan.set('toJSON', {
  virtuals: true,
  transform: transform,
})

module.exports = mongoose.model('Plan', Plan)

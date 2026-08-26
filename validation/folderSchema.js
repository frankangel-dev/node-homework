const Joi = require("joi");

const folderSchema = Joi.object({
  name: Joi.string().trim().min(3).max(30).required(),
});

const patchFolderSchema = Joi.object({
  name: Joi.string().trim().min(3).max(30).not(null),
}).min(1);
module.exports = { folderSchema, patchFolderSchema };
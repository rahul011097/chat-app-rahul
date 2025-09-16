const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-sequence")(mongoose);

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    device_token: { type: String, default: "" } 
});

userSchema.plugin(AutoIncrement, { inc_field: "userId" });

module.exports = mongoose.model("user_modal", userSchema);

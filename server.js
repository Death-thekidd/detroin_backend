const express = require("express");
const cors = require("cors");
const cookieSession = require("cookie-session");

const sendEmail = require("./app/sendMail");

const app = express();

const whitelist = [process.env.CLIENT_ORIGIN, "http://localhost:8081"];

var corsOptions = {
	origin: function (origin, callback) {
		if (whitelist.indexOf(origin) !== -1) {
			callback(null, true);
		} else {
			callback(new Error("Not allowed by CORS"));
		}
	},
	credentials: true,
};

app.use(cors());

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

app.use(
	cookieSession({
		name: "detroinin-session",
		secret: "COOKIE_SECRET", // should use as secret environment variable
		httpOnly: true,
	})
);

const db = require("./app/models");
const Role = db.role;

db.mongoose
	.connect(
		`mongodb+srv://deaththekidd:Pendejos001@cluster0.xu0vgz8.mongodb.net/Detroin`,
		{
			useNewUrlParser: true,
			useUnifiedTopology: true,
		}
	)
	.then(() => {
		console.log("Successfully connect to MongoDB.");
		initial();
	})
	.catch((err) => {
		console.error("Connection error", err);
		process.exit();
	});

async function initial() {
	try {
		const count = await Role.estimatedDocumentCount();

		if (count === 0) {
			try {
				await new Role({ name: "user" }).save();
				console.log("added 'user' to roles collection");

				await new Role({ name: "moderator" }).save();
				console.log("added 'moderator' to roles collection");

				await new Role({ name: "admin" }).save();
				console.log("added 'admin' to roles collection");
			} catch (err) {
				console.log("error", err);
			}
		}
	} catch (err) {
		console.error("Error estimating document count:", err);
	}
}

// simple route
app.get("/", (req, res) => {
	res.json({ message: "Welcome to Coin Dash application." });
});

// routes
require("./app/routes/auth.routes")(app);
require("./app/routes/user.routes")(app);

// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}.`);
});

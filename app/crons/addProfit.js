const db = require("../models");
const User = db.user;
const Plan = db.plan;

export default async function handler(req, res) {
	try {
		const users = await User.find({});
		users?.map((user) => {
			user?.deposits?.map(async (deposit) => {
				if (deposit?.status === "approved" && deposit?.plan) {
					const plan = await Plan.findOne({ id: deposit.plan });
					const profit = (Number(plan?.rate) / 100) * Number(deposit?.amount);
					user.balance += profit;
					user?.wallets?.map((wallet) => {
						if (wallet?.name === deposit?.walletName) {
							wallet.available += profit;
						}
					});
					await user.save();
				}
			});
		});
	} catch (error) {
		return res.status(500).json({ message: "Internal Server Error" });
	}
	res.status(200).json({ message: "Job executed" });
}

export default async function aiHints(req, res) {
  res.json({
    success: true,
    hints: ["Thinking about time complexity is key here."],
  });
}

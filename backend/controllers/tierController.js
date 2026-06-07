const TierList = require('../models/TierList');

// 모든 티어 리스트 가져오기
const getAllTierLists = async (req, res) => {
  try {
    const tierLists = await TierList.find().sort({ createdAt: -1 });
    res.json(tierLists);
  } catch (err) {
    res.status(500).json({ error: '티어 리스트 불러오기 실패' });
  }
};

// 특정 티어 리스트 저장하기
const createTierList = async (req, res) => {
  try {
    const { title, description, tierData, author = 'anonymous', isPublic = true, tags = [] } = req.body;

    const newTierList = new TierList({
      title,
      description,
      tierData,
      author,
      isPublic,
      tags
    });

    const savedTierList = await newTierList.save();
    res.status(201).json(savedTierList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '티어 리스트 저장 실패' });
  }
};

module.exports = {
  getAllTierLists,
  createTierList
};
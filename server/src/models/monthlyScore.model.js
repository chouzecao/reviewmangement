const mongoose = require('mongoose');

const monthlyScoreSchema = new mongoose.Schema({
    month: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                return /^\d{4}-\d{2}$/.test(v);
            },
            message: props => `${props.value} 不是有效的月份格式 (YYYY-MM)`
        }
    },
    totalReviews: {
        type: Number,
        required: true,
        default: 0
    },
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 5,
        validate: {
            validator: function(v) {
                return Number.isFinite(v) && v >= 0 && v <= 5;
            },
            message: props => `${props.value} 不是有效的评分 (0-5)`
        }
    },
    previousScore: {
        type: Number,
        required: true,
        min: 0,
        max: 5,
        default: 3.9 // 初始评分
    },
    scoreDiff: {
        type: Number,
        required: true,
        default: function() {
            return this.score - this.previousScore;
        }
    }
}, {
    timestamps: true
});

// 计算评分差异的中间件
monthlyScoreSchema.pre('save', function(next) {
    this.scoreDiff = this.score - this.previousScore;
    next();
});

// 不需要显式创建索引，因为已经在字段定义中设置了 unique: true

module.exports = mongoose.model('MonthlyScore', monthlyScoreSchema); 
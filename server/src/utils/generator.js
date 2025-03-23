const familyNames = [
  '赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨',
  '朱', '秦', '尤', '许', '何', '吕', '施', '张', '孔', '曹', '严', '华', '金', '魏', '陶', '姜',
  '戚', '谢', '邹', '喻', '柏', '水', '窦', '章', '云', '苏', '潘', '葛', '奚', '范', '彭', '郎',
  '鲁', '韦', '昌', '马', '苗', '凤', '花', '方', '俞', '任', '袁', '柳', '酆', '鲍', '史', '唐',
  '费', '廉', '岑', '薛', '雷', '贺', '倪', '汤', '滕', '殷', '罗', '毕', '郝', '邬', '安', '常',
  '乐', '于', '时', '傅', '皮', '卞', '齐', '康', '伍', '余', '元', '卜', '顾', '孟', '平', '黄',
  '和', '穆', '萧', '尹', '姚', '邵', '湛', '汪', '祁', '毛', '禹', '狄', '米', '贝', '明', '臧'
]

const boyNames = [
  '伟', '强', '磊', '军', '洋', '勇', '刚', '杰', '峰', '超', '波', '辉', '涛', '斌', '康', '帅',
  '凯', '浩', '东', '博', '文', '风', '光', '泽', '晨', '瑞', '朗', '兴', '昊', '天', '明', '阳'
]

const girlNames = [
  '芳', '娜', '敏', '静', '秀', '娟', '丽', '艳', '洁', '燕', '玲', '雪', '琳', '文', '婷', '雅',
  '琴', '云', '莉', '兰', '梅', '月', '霞', '红', '萍', '玉', '露', '莹', '华', '菊', '珍', '璐'
]

// 生成随机整数
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 生成随机中文姓名
const generateName = () => {
  const familyName = familyNames[randomInt(0, familyNames.length - 1)]
  const gender = Math.random() < 0.5 ? 'male' : 'female'
  const namesList = gender === 'male' ? boyNames : girlNames
  const givenName = namesList[randomInt(0, namesList.length - 1)]
  return {
    name: familyName + givenName,
    gender
  }
}

// 生成随机出生日期
const generateBirthDate = () => {
  // 生成1960-2000年之间的随机日期
  const start = new Date(1960, 0, 1)
  const end = new Date(2000, 11, 31)
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  return `${year}${month}${day}`
}

// 生成身份证校验码
const generateCheckCode = (body) => {
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
  
  let sum = 0
  for (let i = 0; i < body.length; i++) {
    sum += parseInt(body[i]) * weights[i]
  }
  
  return codes[sum % 11]
}

// 生成随机身份证号
const generateIdCard = (provinceCode = null) => {
  // 如果没有指定省份，随机选择一个
  const province = provinceCode || String(randomInt(11, 65))
  // 随机生成4位地区码（省份码+城市码）
  const city = randomInt(1, 9).toString().padStart(2, '0')
  const district = randomInt(1, 9).toString().padStart(2, '0')
  
  // 生成出生日期
  const birthDate = generateBirthDate()
  
  // 生成3位顺序码（最后一位表示性别，奇数为男，偶数为女）
  const sequence = randomInt(0, 99).toString().padStart(2, '0')
  const gender = Math.random() < 0.5 ? '1' : '2' // 1为男，2为女
  
  // 拼接身份证前17位
  const body = `${province}${city}${district}${birthDate}${sequence}${gender}`
  
  // 计算校验码
  const checkCode = generateCheckCode(body)
  
  return body + checkCode
}

// 生成指定数量的随机用户数据
const generateUsers = (count = 1, provinceCode = null) => {
  const users = []
  for (let i = 0; i < count; i++) {
    const { name, gender } = generateName()
    const idCard = generateIdCard(provinceCode)
    users.push({ name, idCard })
  }
  return users
}

module.exports = {
  generateUsers
} 
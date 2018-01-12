import Sequelize from 'sequelize'

export default function (sequelize) {
  const Member = sequelize.define('Member', {
    id: {
      type: Sequelize.TEXT,
      primaryKey: true,
      allowNull: false,
    },
    daysInactive: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

  }, {
    timestamps: false,
  })

  const Misc = sequelize.define('Misc', {
    cycles: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
  }, {
    timestamps: false,
    freezeTableName: true,
  })

  const Poll = sequelize.define('Poll', {
    title: {
      type: Sequelize.TEXT,
      allowNull: false,
      primaryKey: true,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    author: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
  }, {
    timestamps: false,
  })

  const PollOption = sequelize.define('PollOption', {
    title: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    poll: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
  }, {
    timestamps: false,
  })

  const PollVote = sequelize.define('PollVote', {
    poll: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    pollOption: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    author: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
  }, {
    timestamps: false,
  })

  return { Member, Misc, Poll, PollOption, PollVote }
}

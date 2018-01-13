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
      defaultValue: 0,
    },
    nextProposalDeadline: {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    stage1: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    proposalTitle: {
      type: Sequelize.TEXT,
    },
    proposalBody: {
      type: Sequelize.TEXT,
    },
    mutableProposalNumber: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    isYesNo: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },
    channel: {
      type: Sequelize.TEXT,
      allowNull: false,
    }
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

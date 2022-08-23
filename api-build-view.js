const express = require('express')
const plansRouter = express.Router()

const Plan = require('../Model/plan.model')
const Assignment = require('../Model/assignment.model')
const Task = require('../Model/task.model')
const Step = require('../Model/step.model')
const Card = require('../Model/card.model')

const { dashLogger } = require('../utils/dashLogger')

const { authenticationValidator } = require('../middleware/auth')
plansRouter.use(authenticationValidator)

const populatePlan = async (plan) => {
  await Assignment.populate(plan, {
    path: 'assignments',
  })
  await Plan.populate(plan, {
    path: 'subPlans parent',
  })
  await Task.populate(plan, {
    path: 'assignments.tasks',
  })
  await Step.populate(plan, {
    path: 'assignments.tasks.steps',
  })
  await Card.populate(plan, {
    path: 'assignments.tasks.steps.card',
  })
}

// Retrieve all plans (with pagination, filter, and search query)
plansRouter.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page || 0)
    const amount = parseInt(req.query.amount || 100)
    const {
      searchQuery,
      showRemoved = 'false',
    } = req.query
    const findQuery = searchQuery
      ? {
          $or: [
            {
              title: { $regex: searchQuery, $options: 'i' },
            },
          ],
        }
      : {}
    const plans = await Plan.find(findQuery)
      .skip(page * amount)
      .limit(amount)

    await populatePlan(plans)

    return res
      .status(200)
      .send(
        plans
          .map((o) => o.toObject())
          .filter((o) => showRemoved === 'true' || !o.isRemoved),
      )
  } catch (error) {
    dashLogger.error(error)
    res.status(500).send({
      message: error.message || `Some error occurred while retrieving plans.`,
    })
  }
})

// Create a plan [Admin only]
plansRouter.post('/', async (req, res) => {
  try {
    if (!req.isAdmin) {
      throw Error('User cannot create a plan.')
    }

    const plan = await Plan(req.body)
    await plan.save()

    await populatePlan(plan)

    return res.status(201).send(plan.toObject())
  } catch (error) {
    dashLogger.error(error)
    res.status(500).send({
      message: error.message || `Some error occurred while retrieving plan.`,
    })
  }
})

// Retrieve a single plan with id
plansRouter.get('/:id', async (req, res) => {
  try {
    const id = req.params.id
    const plan = await Plan.findById(id)
    if (!plan) {
      throw Error('Plan not found.')
    }
    await populatePlan(plan)
    return res.status(200).send(plan.toObject())
  } catch (error) {
    dashLogger.error(error)
    res.status(500).send({
      message: error.message || `Some error occurred while retrieving plan.`,
    })
  }
})

// Update a plan [Admin only]
plansRouter.put('/:id', async (req, res) => {
  try {
    if (!req.isAdmin) {
      throw Error('User cannot create a plan.')
    }

    const id = req.params.id
    const plan = await Plan.findByIdAndUpdate(id, req.body, {
      useFindAndModify: true,
      new: true,
    })
    if (!plan) {
      throw Error('Plan not found.')
    }
    await populatePlan(plan)

    return res.status(200).send(plan.toObject())
  } catch (error) {
    dashLogger.error(error)
    res.status(500).send({
      message: error.message || `Some error occurred while retrieving plan.`,
    })
  }
})

// Delete a plan [Admin only]
plansRouter.delete('/:id', async (req, res) => {
  try {
    if (!req.isAdmin) {
      throw Error('User cannot delete a plan.')
    }
    const { id } = req.params
    const plan = await Plan.findByIdAndDelete(id)
    if (!plan) {
      throw Error('Plan not found.')
    }

    return res.sendStatus(204)
  } catch (error) {
    dashLogger.error(error)
    res.status(500).send({
      message: error.message || `Some error occurred while retrieving plan.`,
    })
  }
})

// Assignments Related Endpoints

// Create a assignment to a plan [Admin only]
plansRouter.post('/:planId/assignments', async (req, res) => {
  try {
    if (!req.isAdmin) {
      throw Error('User cannot create a assignment.')
    }
    const { planId } = req.params
    const plan = await Plan.findById(planId)
    if (!plan) {
      throw Error('Plan not found.')
    }
    const { planType, assignments } = plan
    if (planType === 'repeating' && assignments.length > 0) {
      throw Error('Repeating plans may not have more than one assignments.')
    }
    const assignment = new Assignment(req.body)
    await assignment.save()

    if (!Array.isArray(plan.assignments)) {
      plan.assignments = []
    }
    plan.assignments.push(assignment._id)
    plan.markModified('assignments')
    await plan.save()

    await populatePlan(plan)
    return res
      .status(201)
      .send({ plan: plan.toObject(), assignment: assignment.toObject() })
  } catch (error) {
    dashLogger.error(error)
    res.status(500).send({
      message: error.message || `Some error occurred while retrieving plan.`,
    })
  }
})

// delete an assignment from a plan
plansRouter.delete('/:planId/assignment/:assignmentId', async (req, res) => {
  try {
    if (!req.isAdmin) {
      throw Error('User cannot delete an assignment.')
    }
    const { planId, assignmentId } = req.params
    const plan = await Plan.findById(planId)
    if (!plan) {
      throw Error('Plan not found.')
    }
    const assignment = await Assignment.findById(assignmentId)
    if (!assignment) {
      throw Error('Assignment not found.')
    }

    if (!Array.isArray(plan.assignments)) {
      plan.assignments = []
    }
    plan.assignments = plan.assignments.filter(
      (assignment) => assignment.id !== assignmentId,
    )
    plan.markModified('assignments')
    await plan.save()

    await populatePlan(plan)
    return res.status(204)
  } catch (error) {
    dashLogger.error(error)
    res.status(500).send({
      message:
        error.message || `Some error occurred while deleting an assignment.`,
    })
  }
})

const populateAssignment = async (assignment) => {
  await Task.populate(assignment, {
    path: 'tasks',
  })
  await Step.populate(assignment, {
    path: 'tasks.steps',
  })
  await Card.populate(assignment, {
    path: 'tasks.steps.card',
  })
}

const deepCopySteps = async (stepsWithoutId) =>
  await Promise.all(
    stepsWithoutId.map(async (step) => {
      let cardId
      if (
        step.card &&
        Array.isArray(step.card.category) &&
        step.card.category.length === 0
      ) {
        const newCard = Card({ ...step.card.toObject(), _id: undefined })
        await newCard.save()
        cardId = newCard._id
      }
      const newStepObject = {
        ...step.toObject(),
        _id: undefined,
      }
      if (cardId) {
        newStepObject.card = cardId
      } else if (newStepObject.card) {
        const oldCardId = newStepObject.card.id
        newStepObject.card = oldCardId
      }
      const newStep = Step(newStepObject)
      await newStep.save()
      return newStep._id
    }),
  )

const deepCopyTasks = async (tasksWithoutId) =>
  await Promise.all(
    tasksWithoutId.map(async (task) => {
      const stepsWithoutId = task.steps.map((s) => {
        delete s._id
        return s
      })
      const newStepIds = await deepCopySteps(stepsWithoutId)

      const newTaskObject = {
        ...task.toObject(),
        steps: newStepIds,
      }
      const newTask = Task(newTaskObject)
      await newTask.save()
      return newTask._id
    }),
  )

// Deep copy an assignment [Admin only]
plansRouter.post('/:id/assignments/:assignmentId/copy', async (req, res) => {
  try {
    const { title } = req.body
    if (!req.isAdmin) {
      throw Error('User cannot duplicate an assignment.')
    }
    const { id, assignmentId } = req.params
    const plan = await Plan.findById(id)
    const assignment = await Assignment.findById(assignmentId)
    if (!plan) {
      throw Error('Plan not found.')
    }
    if (!assignment) {
      throw Error('Assignment not found.')
    }

    await populateAssignment(assignment)
    const tasksWithoutId = assignment.tasks.map((t) => {
      delete t._id
      return t
    })
    const newTaskIds = await deepCopyTasks(tasksWithoutId)

    const newAssignmentObject = {
      ...assignment.toObject(),
      _id: undefined,
      tasks: newTaskIds,
    }

    if (title) {
      newAssignmentObject.title = title
    }
    const newAssignment = Assignment(newAssignmentObject)
    await newAssignment.save()

    plan.assignments.push(newAssignment._id)
    await plan.save()

    await populatePlan(plan)
    return res.status(201).send(plan.toObject())
  } catch (error) {
    dashLogger.error(error)
    res.status(500).send({
      message: error.message || `Some error occurred while creating task.`,
    })
  }
})

module.exports = plansRouter

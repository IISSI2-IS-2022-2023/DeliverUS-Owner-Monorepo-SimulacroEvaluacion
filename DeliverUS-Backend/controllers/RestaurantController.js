'use strict'
const models = require('../models')
const Restaurant = models.Restaurant
const Product = models.Product
const RestaurantCategory = models.RestaurantCategory
const ProductCategory = models.ProductCategory

// SOLUTION
exports.index = async function (req, res) {
  try {
    const restaurants = await Restaurant.findAll(
      {
        attributes: ['id', 'name', 'description', 'address', 'postalCode', 'url', 'shippingCosts', 'averageServiceMinutes', 'email', 'phone', 'logo', 'heroImage', 'promoted', 'status', 'restaurantCategoryId'],
        include:
        {
          model: RestaurantCategory,
          as: 'restaurantCategory'
        },
        order: [['promoted', 'DESC'], [{ model: RestaurantCategory, as: 'restaurantCategory' }, 'name', 'ASC']]
      }
    )
    res.json(restaurants)
  } catch (err) {
    res.status(500).send(err)
  }
}

// SOLUTION
exports.indexOwner = async function (req, res) {
  try {
    const restaurants = await Restaurant.findAll(
      {
        attributes: ['id', 'name', 'description', 'address', 'postalCode', 'url', 'shippingCosts', 'averageServiceMinutes', 'email', 'phone', 'logo', 'heroImage', 'promoted', 'status', 'restaurantCategoryId'],
        where: { userId: req.user.id },
        order: [['promoted', 'DESC']]
      })
    res.json(restaurants)
  } catch (err) {
    res.status(500).send(err)
  }
}

exports.create = async function (req, res) {
  const newRestaurant = Restaurant.build(req.body)
  newRestaurant.userId = req.user.id // usuario actualmente autenticado

  if (typeof req.files?.heroImage !== 'undefined') {
    newRestaurant.heroImage = req.files.heroImage[0].destination + '/' + req.files.heroImage[0].filename
  }
  if (typeof req.files?.logo !== 'undefined') {
    newRestaurant.logo = req.files.logo[0].destination + '/' + req.files.logo[0].filename
  }
  try {
    const restaurant = await newRestaurant.save()
    res.json(restaurant)
  } catch (err) {
    res.status(500).send(err)
  }
}

exports.show = async function (req, res) {
  // Only returns PUBLIC information of restaurants
  try {
    const restaurant = await Restaurant.findByPk(req.params.restaurantId, {
      attributes: { exclude: ['userId'] },
      include: [{
        model: Product,
        as: 'products',
        include: { model: ProductCategory, as: 'productCategory' }
      },
      {
        model: RestaurantCategory,
        as: 'restaurantCategory'
      }],
      order: [[{ model: Product, as: 'products' }, 'order', 'ASC']]
    }
    )
    res.json(restaurant)
  } catch (err) {
    res.status(500).send(err)
  }
}

exports.update = async function (req, res) {
  if (typeof req.files?.heroImage !== 'undefined') {
    req.body.heroImage = req.files.heroImage[0].destination + '/' + req.files.heroImage[0].filename
  }
  if (typeof req.files?.logo !== 'undefined') {
    req.body.logo = req.files.logo[0].destination + '/' + req.files.logo[0].filename
  }
  try {
    await Restaurant.update(req.body, { where: { id: req.params.restaurantId } })
    const updatedRestaurant = await Restaurant.findByPk(req.params.restaurantId)
    res.json(updatedRestaurant)
  } catch (err) {
    res.status(500).send(err)
  }
}

exports.destroy = async function (req, res) {
  try {
    const result = await Restaurant.destroy({ where: { id: req.params.restaurantId } })
    let message = ''
    if (result === 1) {
      message = 'Sucessfuly deleted restaurant id.' + req.params.restaurantId
    } else {
      message = 'Could not delete restaurant.'
    }
    res.json(message)
  } catch (err) {
    res.status(500).send(err)
  }
}

// SOLUTION
exports.promote = async function (req, res) {
  const t = await models.sequelize.transaction()
  try {
    const existingPromotedRestaurant = await Restaurant.findOne({ where: { userId: req.user.id, promoted: true } })
    if (existingPromotedRestaurant) {
      await Restaurant.update(
        { promoted: false },
        { where: { id: existingPromotedRestaurant.id } },
        { transaction: t }
      )
    }
    await Restaurant.update(
      { promoted: true },
      { where: { id: req.params.restaurantId } },
      { transaction: t }
    )
    await t.commit()
    const updatedRestaurant = await Restaurant.findByPk(req.params.restaurantId)
    res.json(updatedRestaurant)
  } catch (err) {
    await t.rollback()
    res.status(500).send(err)
  }
}

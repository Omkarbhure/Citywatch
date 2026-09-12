import PushSubscription from '../models/PushSubscription.js';

/**
 * @desc    Save or update a Web Push subscription for the authenticated user
 * @route   POST /api/push/subscribe
 * @access  Protected
 */
export const subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;

    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        user: req.user._id,
        endpoint,
        keys
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      message: 'Push subscription saved successfully',
      subscriptionId: subscription._id
    });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ message: 'Server error saving push subscription' });
  }
};

/**
 * @desc    Remove a Web Push subscription for the authenticated user
 * @route   POST /api/push/unsubscribe
 * @access  Protected
 */
export const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;

    await PushSubscription.findOneAndDelete({
      endpoint,
      user: req.user._id
    });

    res.json({ message: 'Push subscription removed successfully' });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ message: 'Server error removing push subscription' });
  }
};

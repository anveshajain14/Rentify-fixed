import dbConnect from '../lib/mongodb.js';
import { getAuthUser } from '../lib/auth.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { emitToConversation, emitToUsers } from '../lib/socket.js';

function isMember(conversation, userId) {
  return (
    String(conversation.sellerId) === String(userId) ||
    String(conversation.renterId) === String(userId)
  );
}

export async function createOrGetConversation(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    const { sellerId } = req.body;
    if (!sellerId) return res.status(400).json({ message: 'sellerId is required' });
    if (String(sellerId) === String(user._id)) {
      return res.status(400).json({ message: 'Cannot create conversation with yourself' });
    }

    await dbConnect();

    const seller = await User.findById(sellerId).select('role');
    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const renterId = user._id;
    const conversation = await Conversation.findOneAndUpdate(
      { sellerId, renterId },
      {
        $setOnInsert: {
          sellerId,
          renterId,
          lastMessage: '',
          lastMessageAt: new Date(),
        },
      },
      { upsert: true, new: true }
    )
      .populate('sellerId', 'name avatar')
      .populate('renterId', 'name avatar');

    return res.status(201).json({ conversation });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create conversation' });
  }
}

export async function getConversations(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    await dbConnect();

    const conversations = await Conversation.find({
      $or: [{ sellerId: user._id }, { renterId: user._id }],
    })
      .populate('sellerId', 'name avatar')
      .populate('renterId', 'name avatar')
      .sort({ lastMessageAt: -1 });

    return res.json({ conversations });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch conversations' });
  }
}

export async function getMessages(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    const { conversationId } = req.params;
    if (!conversationId) return res.status(400).json({ message: 'conversationId is required' });

    await dbConnect();
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    if (!isMember(conversation, user._id)) {
      return res.status(403).json({ message: 'Not authorized for this conversation' });
    }

    const messages = await Message.find({ conversationId })
      .populate('senderId', 'name avatar')
      .populate('productId', 'title images pricePerDay')
      .sort({ createdAt: 1 });

    return res.json({ messages });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch messages' });
  }
}

export async function sendMessage(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });

    const { conversationId, text, productId } = req.body;
    if (!conversationId) return res.status(400).json({ message: 'conversationId is required' });
    if (!text || !String(text).trim()) return res.status(400).json({ message: 'text is required' });

    await dbConnect();

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    if (!isMember(conversation, user._id)) {
      return res.status(403).json({ message: 'Not authorized for this conversation' });
    }

    const nextText = String(text).trim();
    const message = await Message.create({
      conversationId,
      senderId: user._id,
      text: nextText,
      productId: productId || null,
    });

    conversation.lastMessage = nextText;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const hydrated = await Message.findById(message._id)
      .populate('senderId', 'name avatar')
      .populate('productId', 'title images pricePerDay');

    const conversationPayload = await Conversation.findById(conversationId)
      .populate('sellerId', 'name avatar')
      .populate('renterId', 'name avatar');

    emitToConversation(conversationId, 'newMessage', hydrated);
    emitToUsers(
      [conversation.sellerId, conversation.renterId],
      'conversationUpdated',
      conversationPayload
    );

    return res.status(201).json({ message: hydrated });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to send message' });
  }
}

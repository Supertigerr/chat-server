import { NextFunction, Request, Response } from 'express';
import { getChannelCache } from '../cache/ChannelCache';
import { getServerMemberCache } from '../cache/ServerMemberCache';
import { generateError } from '../common/errorHandler';

interface Options {
  allowBot?: boolean;
}


// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Options {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function channelVerification (opts?: Options) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { channelId } = req.params;

    if (!channelId) {
      return res.status(403).json(generateError('Channel ID is required.'));
    }
    
    const [channel, error] = await getChannelCache(channelId, req.accountCache.user._id);

    if (error !== null) {
      return res.status(403).json(generateError(error));
    }
    if (channel.server) {
      const [memberCache, error] = await getServerMemberCache(channel.server._id, req.accountCache.user._id);
      if (error !== null) {
        return res.status(403).json(generateError(error));
      }
      req.serverMemberCache = memberCache;
      req.serverCache = channel.server;
    }

    if (!channel.server && channel?.inbox?.recipient) {
      const isRecipient = channel.inbox.recipient.toString() === req.accountCache.user._id.toString();
      const isCreator = channel.inbox.createdBy?.toString() === req.accountCache.user._id.toString();
      if (!isRecipient && !isCreator) {
        return res.status(403).json(generateError('You are not a member of this channel.'));
      }
    }

    req.channelCache = channel;
    next();

  };
}
import dotenv from 'dotenv';
import Twitter from 'twitter';
import Twit from 'twit';


const BOT_NAME = "@Dagbot1"
const BOT_NAME_NO_MENTION =  'dagbot1'

dotenv.config();

console.log(process.env);

const client = new Twitter({
	consumer_key: process.env.TWITTER_CONSUMER_KEY as string,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET as string,
	access_token_key:  process.env.TWITTER_ACCESS_TOKEN_KEY as string,
	access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET as string

});

const twitc = new Twit({
	consumer_key: process.env.TWITTER_CONSUMER_KEY as string,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET as string,
	access_token:  process.env.TWITTER_ACCESS_TOKEN_KEY as string,
	access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET as string
})

function isNumeric(value: string) : boolean {
    return /^\d+$/.test(value);
}

function ProcessTweetStr(value: string): string {
	let re = new RegExp(`${BOT_NAME}(\\s*)`, "g")
	return value.replace(re, '');
}

function ReplyTweet(text: string, reply_to: string) {
	client.post('statuses/update', {
		status: text,
		in_reply_to_status_id: reply_to
	}, (error, data: any, response) => {
		if (error) {
 				console.log(error)
			} else {
			console.log(data.text + ' tweeted!')
			 }
	} );
}

// Broken typing on this because this payload won't work with normal Twitter, and needs twitc
// client passed as any to avoid typing error
export function CreateDm(twit_clt: any, recipient_id: string, text: string) {
	twit_clt.post('direct_messages/events/new', {
		event: {
			type: 'message_create',
			message_create: {
				target: {
					recipient_id: recipient_id
				},
				message_data: {
					text: text
				}
			},
		}
	}, (error: any, data: any, response: any) => {
		if (error) {
				console.log(error)
		} else {
			console.log(data.text + ' tweeted!')
			}
	});
}


async function main() {
	var stream = client.stream('statuses/filter', {track: BOT_NAME_NO_MENTION});
	stream.on('data', function(event) {
		if (event.text.toLowerCase().startsWith(BOT_NAME.toLowerCase())) { 
			const pl: string[] = ProcessTweetStr(event.text).split(' ');
			if (pl[0] == 'tip') {
				if (pl.length >= 2) {
					if (isNumeric(pl[1])) {
						const amt = parseFloat(pl[1]);
						if (event.in_reply_to_status_id) {
							ReplyTweet(`@${event.in_reply_to_screen_name} just got a tip of ${amt} from @${event.user.screen_name}`, event.id_str)
						} else {
							const us = pl[2];
							if (us && us.startsWith('@')) {
								// Find a Way to use twitter API v2 
								// Find user_id by mention or just store username
								// Design decision tbd
							} else {
								ReplyTweet(`@${event.user.screen_name} Unable to find user to transfer funds too. Either reply to tweet of user, or @ them with syntax '${BOT_NAME} tip <amt> @user'`,event.id_str);
							}
						}
					} else {
						console.log("error");
						ReplyTweet(`@${event.user.screen_name} Unable to generate number from amount or amount was less than 0. Tip amount: ${pl[1]}`,event.id_str);
					};
				} else {	
					ReplyTweet(`@${event.user.screen_name} Insufficient arguments. Use syntax '${BOT_NAME} tip <amt> <@user/not necceasry if replying>'`, event.id_str);
				}
			} else if (pl[0] == 'balance') {
				CreateDm(twitc, event.user.id_str, 'Your balance is <>');
			} else if (pl[0] == 'deposit') {
				CreateDm(twitc, event.user.id_str, 'Your deposit address is <>');
			} else if (pl[0] == 'withdraw') {
				if (pl.length >= 2) {
					if (pl[1].toLowerCase() == 'all') {
						console.log('Everything withdrawal');
					} else if (isNumeric(pl[1])) {
						const amt = parseFloat(pl[1]);
						console.log(amt);

					} else {
						console.log("error");
						ReplyTweet(`@${event.user.screen_name} Unable to generate number from amount or amount was less than 0. Tip amount: ${pl[1]}`,event.id_str);
					};
				} else {	
					ReplyTweet(`@${event.user.screen_name} Insufficient arguments. Use syntax '${BOT_NAME} tip <amt> <@user/not necceasry if replying>'`, event.id_str);
				}
			} else {
				console.log('not a tip');
			}
		};
	});
	stream.on('error', function(error) {
	  throw error;
	});
}

main().catch((e) => console.error(e));
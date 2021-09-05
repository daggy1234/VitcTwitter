import dotenv from 'dotenv';
import Twitter from 'twitter';
import Twit from 'twitter-api-v2';


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
	appKey: process.env.TWITTER_CONSUMER_KEY as string,
	appSecret: process.env.TWITTER_CONSUMER_SECRET as string,
	accessToken:  process.env.TWITTER_ACCESS_TOKEN_KEY as string,
	accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET as string
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

function CreateDm(recipient_id: string, text: string) {
	twitc.v1.sendDm({
		recipient_id: recipient_id,
		text: text
	}).then((data) => console.log(data)).catch((err) => console.error(err) );
}

async function main() {
	var stream = client.stream('statuses/filter', {track: BOT_NAME_NO_MENTION});
	const loggedInTwitc = await twitc.appLogin();
	console.log(loggedInTwitc);
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
								try {
								loggedInTwitc.v2.userByUsername(us.replace('@', '')).then((user) => {
									if (user.errors) {
										ReplyTweet(`@${event.user.screen_name} unable to find user to send coins too!` , event.id_str)
									} else {
										ReplyTweet(`@${user.data.username} got a tip of ${amt} from @${event.user.screen_name}` , event.id_str)
									}
								});
							} catch (err) {
								console.log(err);
								ReplyTweet(`@${event.user.screen_name} unable to find user to send coins too!` , event.id_str);
							}
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
				CreateDm(event.user.id_str, 'Your balance is <>');
			} else if (pl[0] == 'deposit') {
				CreateDm(event.user.id_str, 'Your deposit address is <>');
			} else if (pl[0] == 'withdraw') {
				if (pl.length >= 3) {
					const isAll = pl[1].toLowerCase() == 'all';
					const isNumerical = isNumeric(pl[1]);
					if (isAll || isNumerical) {
						let amt;
						if (isAll) {
							console.log('Everything withdrawal');
							amt = -1;
						} else {
							amt = parseFloat(pl[1]);
							console.log(amt);
						}
						ReplyTweet(`@${event.user.screen_name} Will withdraw ${amt} for wallet address ${pl[2]}`,event.id_str);

					} else {
						console.log("error");
						ReplyTweet(`@${event.user.screen_name} Unable to generate number from amount or amount was less than 0. Tip amount: ${pl[1]}`,event.id_str);
					};
				} else {	
					ReplyTweet(`@${event.user.screen_name} Insufficient arguments. Use syntax '${BOT_NAME} withdraw <amt> <address>'`, event.id_str);
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
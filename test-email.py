import os
import requests
def send_simple_message():
  	return requests.post(
  		"https://api.mailgun.net/v3/sandbox14a84927cb824d1eaf788e8bc4b47baa.mailgun.org/messages",
  		auth=("api", os.getenv('API_KEY', '')),
  		data={"from": "Mailgun Sandbox <postmaster@sandbox14a84927cb824d1eaf788e8bc4b47baa.mailgun.org>",
			"to": "Himanshu <himanshu-navan@outlook.com>",
  			"subject": "Hello Himanshu",
  			"text": "Congratulations Himanshu, you just sent an email with Mailgun! You are truly awesome!"})

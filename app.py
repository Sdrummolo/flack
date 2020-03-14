import os
from os import environ
from flask import Flask, session, render_template, request, redirect
from flask_session import Session
from flask_socketio import SocketIO, emit

app = Flask(__name__)

app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
app.config["SECRET_KEY"] = environ.get('SECRET_KEY')
socketio = SocketIO(app)
Session(app)


# Data objects
channels = {'welcome': {'messages': [], 'users': [], 'dates': []}}
users = []


# routes
@app.route("/login", methods=["GET", "POST"])
def login():
   # Remove user from users dict and cancel session
   if session.get("username") in users:
      users.remove(session.get("username"))
      session.clear()

   if request.method == "POST":
      # Extract data from the form
      username = request.form.get("username")
      # Ensure form is filled correctly
      if not username:
         return render_template("error.html", errorMsg="You must insert a username")
      if len(username) > 20:
         return render_template("error.html", errorMsg="Max length allowed: 20")
      # Ensure username is available
      if username in users:
         return render_template("error.html", errorMsg="Username already taken")

      # Create session
      session["username"] = username
      # Add new user to users object
      users.append(username)
      return  redirect("/")

   return render_template("login.html")



@app.route("/")
def index():
   # If not logged in redirect to login page
   if session.get("username") is None:
        return redirect("/login")

   return render_template("index.html", username=session.get("username"))


#------COMPLETED-----
@app.route("/error", methods=["POST"])
def error(errorMsg):
    return render_template("error.html", errorMsg=errorMsg)



# Socketio routes
@socketio.on("query channels")
def queryChannels():
    emit("load channels", channels, broadcast=True)



@socketio.on("query users")
def queryUsers():
   emit("load users", users, broadcast=True)



@socketio.on("query messages")
def queryMessages(channel, date):
   if session.get("username") not in channels[channel]["users"]:
      channels[channel]["messages"] += [f"joined #{channel}"]
      channels[channel]["users"] += [session.get("username")]
      channels[channel]["dates"] += [date]
   emit("load messages", {'data': channels[channel], 'channel': channel}, broadcast=True)


@socketio.on("add channel")
def addChannel(channel):
   if channel not in channels.keys():
        channels[channel] = {"messages": [],
                          "users": [],
                          "dates": []
                           }
   emit("load channels", channels, broadcast=True)


@socketio.on("add message")
def addMessage(data, channel):
   # Only store 100 messages
   if len(channels[channel]["messages"]) > 100:
      channels[channel]["messages"].pop(0)
      channels[channel]["users"].pop(0)
      channels[channel]["dates"].pop(0)

   channels[channel]["messages"] += [data["text"]]
   channels[channel]["users"] += [session.get("username")]
   channels[channel]["dates"] += [data["date"]]

   emit("load messages", {'data': channels[channel], 'channel': channel}, broadcast=True)
   
   

if __name__ == '__main__':
    socketio.run(app)
// selectors
const channelsList = document.querySelector("#channels-list");
const usersList = document.querySelector("#users-list");
const navChannel = document.querySelector("#nav-channel");
const sidebarUsername = document.querySelector("#sidebar-username");
const channelForm = document.querySelector("#add-channel-form");
const messageForm = document.querySelector("#send-message-form");
const channelInput = document.querySelector("#new-channel");
const messageInput = document.querySelector("#new-message");
const messagesContainer = document.querySelector("#messages");
const channelSubmit = document.querySelector("#channel-submit");

// Connect to socketio
var socket = io.connect(
	location.protocol + "//" + document.domain + ":" + location.port
);

window.onload = scrollBottom();

// Load content onload
socket.on("connect", () => {
	// Set welcome as currentChannel if first time access
	if (localStorage.getItem("currentChannel") == undefined) {
		localStorage.setItem("currentChannel", "welcome");
	}
	// Populate channels ul
	socket.emit("query channels");
	// Populate users ul
	socket.emit("query users");
	// Change input placeholder according to last opened chat
	messageInput.placeholder = `Message #${localStorage.getItem(
		"currentChannel"
	)}`;
	navChannel.textContent = "# " + localStorage.getItem("currentChannel");

	socket.emit(
		"query messages",
		localStorage.getItem("currentChannel"),
		(date = new Date().toLocaleString())
	);
});

// Add dinamic event listeners
$(document).on("click", ".channel-link", function(e) {
	e.preventDefault();
	// Set currently active channel in local storage
	localStorage.setItem("currentChannel", this.dataset.channel);
	localStorage.removeItem("currentUser");
	// Add  current channel to top navbar
	navChannel.innerText = `# ${localStorage.getItem("currentChannel")}`;
	// Remove selected class from users ul
	socket.emit("query channels");
	socket.emit("query users");
	socket.emit(
		"query messages",
		this.dataset.channel,
		(date = new Date().toLocaleString())
	);
});

socket.on("load channels", data => {
	// Reset ul
	channelsList.innerHTML = "";
	// Populate ul with channels
	for (channel of Object.keys(data)) {
		const li = document.createElement("li");
		li.innerHTML = `<a href="" class="channel-link" data-channel="${channel}"><span>#</span> ${channel}</a>`;

		// Add selected class to li
		if (channel == navChannel.innerText.split(" ")[1]) {
			li.classList.add("li-selected");
		} else {
			li.classList.remove("li-selected");
		}
		channelsList.append(li);
	}
});

socket.on("load users", data => {
	// Reset ul
	usersList.innerHTML = "";
	// Populate ul with users
	for (user of data) {
		const li = document.createElement("li");

		li.innerHTML = `<i class="fas fa-circle fa-xs"></i> ${user}`;
		if (user == sidebarUsername.innerText) {
			li.innerHTML += `<span> (you)</span`;
		}
		usersList.append(li);
	}
});

socket.on("load messages", data => {
	// Change input placeholder according to current channel
	messageInput.placeholder = `Message # ${localStorage.getItem(
		"currentChannel"
	)}`;

	// Extract data from object
	const messages = data["data"]["messages"];
	const users = data["data"]["users"];
	const dates = data["data"]["dates"];
	const channel = data["channel"];

	// Update message container only if the user is on the same channel that recieved the message
	if (localStorage.getItem("currentChannel") == channel) {
		let lastUser;
		// Reset ul
		messagesContainer.innerHTML = "";
		// Populate ul with messages
		for (let i = 0; i < messages.length; i++) {
			if (lastUser !== users[i]) {
				const div = document.createElement("div");
				div.innerHTML = `
 								<div class="message">
 									<div class="msg-data">
 										<div class="msg-img">
 											<i class="fas fa-user fa-3x"></i>
 										</div>
 										<p class="msg-username">${users[i]}</p>
 										<small class="msg-time">${dates[i]}</small>
 									</div>
 									<div class="msg-text">
 										<p>${messages[i]}</p>
 									</div>
 								</div>
 								`;
				messagesContainer.append(div);
				lastUser = users[i];
			} else {
				messagesContainer.lastChild.lastElementChild.lastElementChild.innerHTML += `<p>${messages[i]}</p>`;
			}
		}
	}

	scrollBottom();
});

// Form event listeners
channelForm.addEventListener("submit", e => {
	e.preventDefault();

	const newChannel = channelInput.value;
	channelInput.value = "";

	socket.emit("add channel", newChannel);
});

messageForm.addEventListener("submit", e => {
	e.preventDefault();

	const newMessage = {
		text: messageInput.value,
		date: new Date().toLocaleString()
	};
	messageInput.value = "";

	socket.emit(
		"add message",
		newMessage,
		localStorage.getItem("currentChannel")
	);
});

// UX stuff
function scrollBottom() {
	messagesContainer.scrollTop =
		messagesContainer.scrollHeight - messagesContainer.clientHeight;
}

// Disable buttons if no value
channelInput.addEventListener("keyup", () => {
	if (channelInput.value.length !== 0) {
		channelSubmit.disabled = false;
	}
	if (channelInput.value.length == 0) {
		channelSubmit.disabled = true;
	}
});

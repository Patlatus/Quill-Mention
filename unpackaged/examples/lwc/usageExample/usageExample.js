import { LightningElement, track } from "lwc";
import getUsers from "@salesforce/apex/UsageExampleCont.users";
export default class UsageExample extends LightningElement {
	@track users;
	@track userDTOs;
	connectedCallback() {
		debugger;
		getUsers().then(result => {
			this.users = result;
			this.userDTOs = this.users.map(x => {
				let y = { ...x };
				y.disabled = !x.IsActive;
				y.link = "/" + x.Id;
				y.target = "_blank";
				return y;
			});
		});
	}
	text;
	deltas;

	handleEdit(event) {
		this.text = event.detail.text;
		debugger;
		console.log(event.detail.deltas);
		this.deltas = JSON.stringify(event.detail.deltas);
	}

	matchFunction = searchTerm => x =>
		x.LastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
		x.FirstName.toLowerCase().includes(searchTerm.toLowerCase());
	renderItem = item => `${item.LastName}` + (item.FirstName ? ` ${item.FirstName}` : "");
}

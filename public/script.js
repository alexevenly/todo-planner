function init() {
	var elements = document.querySelectorAll("li, td");
	const homeButton = document.getElementById("home-button");
	const continueButton = document.getElementById("continue-button");
	const appearing = document.getElementById("appearing");

	// Get the search string from the URL
	let searchParams = new URLSearchParams(window.location.search);

	// Get the value of the query parameter 'filename'
	const dateString = searchParams.get('date');
	const dayOfWeek = searchParams.get('dayOfWeek');
	const isNewStr = searchParams.get('new');
	let isNew = (isNewStr == "true");;
	const date = new Date(dateString);
	const options = { year: 'numeric', month: 'long', day: 'numeric' };
	const formattedDate = date.toLocaleDateString('ru-RU', options);
	document.querySelector('h1').textContent = formattedDate;
	document.querySelector('h2').textContent = dayOfWeek;

	const priorList = document.getElementById("priorities");
	const todoList = document.getElementById("todo");
	const mementoList = document.getElementById("memento");
	const addTimePeriodBtn = document.querySelector('#add_time_period');
	const timeOverlayHolder = document.querySelector('#time_overlay_holder');
	const colors = ['#0048BA75', '#B0BF1A75', '#7CB9E875', '#C4621075', '#00A86B75', '#8DB60075', '#9966CC75', '#FF8C0075', '#FFD70075', '#FF7F5075', '#00FFFF75', '#FF6FFF75', '#4B532075', '#DE316375', '#FB607F75'];
	let notSelectedColors = colors;
	let editabilityInitialized = false;

	addTimePeriodBtn.addEventListener('click', function() {
		const fromInput = document.querySelector('#from');
		const toInput = document.querySelector('#to');
		const contentInput = document.querySelector('#content');
		const timeOverlay = document.createElement('div');
		const timeOverlayDelete = document.createElement('button');
		// Calculate the height and top position based on the input values
		const fromHours = parseInt(fromInput.value.substring(0, 2));
		const fromMinutes = parseInt(fromInput.value.substring(3, 5));
		const toHours = parseInt(toInput.value.substring(0, 2));
		const toMinutes = parseInt(toInput.value.substring(3, 5));
		const top = (120 + fromHours*80 + fromMinutes*80/60) + 'px';
		const height = ((toHours*60 + toMinutes - fromHours*60 - fromMinutes)*80/60 - 2) + 'px';
		// Set the styles and text content for the time overlay
		timeOverlay.className = 'time_overlay';
		timeOverlay.setAttribute('start', fromInput.value);
		timeOverlay.setAttribute('end', toInput.value);
		timeOverlay.style.top = top;
		timeOverlay.style.height = height;
		if(notSelectedColors.length < 3) {
			notSelectedColors = colors;
		}
		
		timeOverlay.style.backgroundColor = notSelectedColors[Math.floor(Math.random() * notSelectedColors.length)];
		
		const valueToRemove = timeOverlay.style.backgroundColor;
		const index = notSelectedColors.indexOf(valueToRemove);
		if (index !== -1) {
			notSelectedColors.splice(index, 1);
		}

		
		timeOverlay.textContent = contentInput.value;
		// Set button
		timeOverlayDelete.id = 'time_delete_button';
		timeOverlayDelete.textContent = 'X';
		timeOverlayDelete.addEventListener('click', function(event) {
			const start = event.target.parentNode.getAttribute('start');
			if(start) {
				setCookie('fromDate', start, 7);
				const fromInput = document.querySelector('#from');
				fromInput.value = start;
			}
			event.target.parentNode.parentNode.removeChild(event.target.parentNode);
			save();
		});
		timeOverlay.appendChild(timeOverlayDelete);
		
		timeOverlay.addEventListener('mouseenter', (event) => {
			//alert('FIRE!');
			const start = event.target.getAttribute('start');
			const end = event.target.getAttribute('end');
			const tooltipText = `Time: ${start} - ${end}`;

			// Create a tooltip element
			const tooltip = document.createElement('div');
			tooltip.className = 'tooltip';
			tooltip.textContent = tooltipText;
			
			// Position the tooltip next to the hovered element
			const rect = event.target.getBoundingClientRect();
			tooltip.style.left = `${rect.right}px`;
			tooltip.style.top = `${rect.top}px`;
			tooltip.style.position = 'absolute';
			
			// Add the tooltip to the document
			document.body.appendChild(tooltip);
		});

		timeOverlay.addEventListener('mouseleave', (event) => {
			// Remove the tooltip from the document
			removeTooltip();
		});

		// Add the time overlay to the holder div
		timeOverlayHolder.appendChild(timeOverlay);
		
		fromInput.value = toInput.value;
		toInput.value = "";
		contentInput.value = "";

		setCookie('fromDate', fromInput.value, 7);

		save();

		fromInput.value = getCookie('fromDate');
	});
	
	isSaved = true;

	function addButtons(){
		addButton(priorList, 'priority');
		addButton(todoList, 'todo');
		addButton(mementoList, 'memento');
	}

	function addButton(list, text) {
		const blockHeader = list.parentNode.querySelector(".header");
		const h3 = blockHeader.querySelector("h3");
		const addBtn = document.createElement("button");
		addBtn.textContent = "+";
		addBtn.addEventListener("click", () => {
			const newCont = document.createElement("li");
			const checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			newCont.appendChild(checkbox);
			const newTask = document.createElement("span");
			newTask.textContent = ` New ${text}`;
			newCont.appendChild(newTask);
			list.appendChild(newCont);
			updateEditability('addButton (single)');
			isSaved = false;
		});
		blockHeader.insertBefore(addBtn, h3.nextSibling);
	}

	if (!isNew) {
		const filePath = '/data/' + dateString;
		loadContent(filePath);
	} else {
		constructCheckList();
		// updateEditability will be called by constructCheckList
	}
	addButtons();

	function makeSelected(element) {
		deselectAll();
		element.style.border = "2px solid red";
		element.contentEditable = true;
		element.focus();

		element.addEventListener("keydown", function(event) {
			if (event.key === "Enter") {
				isSaved = false;
				if (event.target.parentNode.parentNode.id === "memento") {
					updateCheckList();
				}
				deselectAll();
			}
			if (event.key === "Delete") {
				isSaved = false;
				if (event.target.tagName === "SPAN") {
					if (event.target.parentNode.parentNode.id === "memento") {
						if (event.target.parentNode) {
							event.target.parentNode.parentNode.removeChild(event.target.parentNode);
							updateCheckList();
						}
					} else {
						if (event.target.parentNode) {
							event.target.parentNode.parentNode.removeChild(event.target.parentNode);
						}
					}
				}
				deselectAll();
			}
		});
	}

	function loadContent(file) {
		fetch(file)
		.then(function(response) {
			if (response.status === 401) {
				// Redirect to login if unauthorized
				window.location.href = '/login.html';
				return;
			}
			if (response.ok) {
				return response.json();
			} else {
				console.error('LOADING ERROR!!!');
				console.error(response);
			}
		})
		.then(function(data) {
			if (!data) return; // Exit if redirected to login
			
			// data is the parsed JSON response
			const content = data['content'];
			const lists = ['priorities', 'todo', 'memento'];
			
			lists.forEach(list => {  
				if (content['lists'] && content['lists'][list]) { 
					const elements = content['lists'][list];  
					const listContainer = document.getElementById(list);
					while (listContainer.firstChild) {
						listContainer.removeChild(listContainer.firstChild);
					}
			  
					elements.forEach(element => {  
						const newEntity = document.createElement("li");
						const checkbox = document.createElement("input");
						const span = document.createElement("span");
						
						checkbox.type = "checkbox";
						checkbox.checked = element['checked'] || false;
						
						// Clean HTML markup from content - extract text only
						let cleanContent = element['content'] || '';
						if (cleanContent.includes('<')) {
							// If content contains HTML, extract text from it
							const tempDiv = document.createElement('div');
							tempDiv.innerHTML = cleanContent;
							cleanContent = tempDiv.textContent || tempDiv.innerText || '';
						}
						
						span.textContent = cleanContent;
						span.contentEditable = false;
						
						newEntity.appendChild(checkbox);
						newEntity.appendChild(span);
						listContainer.appendChild(newEntity);  
					});  
				} 
			});

			timeOverlayHolder.innerHTML = content['table'];
			const fromInput = document.querySelector('#from');
			fromInput.value = getCookie('fromDate');
			updateEditability('loadContent');
			isSaved = true; // Mark as saved after loading content
			
			// Ensure editability is properly initialized after loading
			setTimeout(() => {
				updateEditability('loadContent-delayed');
			}, 100);
		});
	}

	function deselectAll() {
		for (let i = 0; i < elements.length; i++) {
		  elements[i].style.border = "";
		  elements[i].contentEditable = false;
		}
		// Removed automatic save() call to prevent auto-saving empty days
	}

	function updateEditability(from) {
		// Allow re-initialization for new content or when explicitly requested
		if (editabilityInitialized && from !== 'loadContent' && from !== 'addButton (single)' && from !== 'loadContent-delayed') {
			return;
		}
		
		//elements = document.querySelectorAll("li, td:not(:first-child)");
		elements = document.querySelectorAll("li span");
		
		// Remove existing event listeners by cloning elements
		elements.forEach(element => {
			const newElement = element.cloneNode(true);
			element.parentNode.replaceChild(newElement, element);
		});
		
		// Re-query elements after cloning
		elements = document.querySelectorAll("li span");
		
		for (let i = 0; i < elements.length; i++) {
			elements[i].addEventListener("click", function(event) {
				event.stopPropagation();
				makeSelected(this);
			});
		}
		
		// Add event listeners for checkboxes
		const checkboxes = document.querySelectorAll("li input[type='checkbox']");
		checkboxes.forEach(checkbox => {
			const newCheckbox = checkbox.cloneNode(true);
			// Preserve the checked state when cloning
			newCheckbox.checked = checkbox.checked;
			checkbox.parentNode.replaceChild(newCheckbox, checkbox);
		});
		
		// Re-query checkboxes after cloning
		const newCheckboxes = document.querySelectorAll("li input[type='checkbox']");
		for (let i = 0; i < newCheckboxes.length; i++) {
			newCheckboxes[i].addEventListener("change", function(event) {
				isSaved = false;
				save();
			});
		}
		
		editabilityInitialized = true;
		
		const deleteButtons = document.querySelectorAll("#time_delete_button");
		for (let i = 0; i < deleteButtons.length; i++) {
			deleteButtons[i].addEventListener("click", function(event) {
				const start = event.target.parentNode.getAttribute('start');
				if(start) {
					setCookie('fromDate', start, 7);
					const fromInput = document.querySelector('#from');
					fromInput.value = start;
				}
				event.target.parentNode.parentNode.removeChild(event.target.parentNode);
				save();
				removeTooltip();
			});
		}
		const timeOverlays = document.querySelectorAll(".time_overlay");
		for (let i = 0; i < timeOverlays.length; i++) {
			timeOverlays[i].addEventListener("mouseenter", (event) => {
				//alert('FIRE!');
				const start = event.target.getAttribute('start');
				const end = event.target.getAttribute('end');
				if(start && end) {
					const tooltipText = `Time: ${start} - ${end}`;

					// Create a tooltip element
					const tooltip = document.createElement('div');
					tooltip.className = 'tooltip';
					tooltip.textContent = tooltipText;
					
					// Position the tooltip next to the hovered element
					tooltip.style.left = `${parseFloat(getComputedStyle(event.target).width) - parseFloat(getComputedStyle(event.target).left)*2}px`;
					tooltip.style.top = `${parseFloat(getComputedStyle(event.target).top) + parseFloat(getComputedStyle(event.target).height)/2}px`;
					tooltip.style.position = 'absolute';
					
					// Add the tooltip to the document
					event.target.parentNode.appendChild(tooltip);
				}
			});

			timeOverlays[i].addEventListener("mouseleave", (event) => {
				// Remove the tooltip from the document
				removeTooltip();
			});

		}
	}

	homeButton.addEventListener("click", function() {
		deselectAll();
		if(isSaved){
		  window.location.href = '/';
		} else {
		  appearing.style = "display:block;";
		}
	});

	continueButton.addEventListener("click", function() {
		window.location.href = '/';
	});

	function save() {
		const data = {
		  'lists':{
			'priorities':[],
			'todo':[],
			'memento':[]
		  }
		};

		const fileName = dateString;

		const tableContent = timeOverlayHolder.innerHTML;
		data['table'] = tableContent;
		collectData("#priorities li", "priorities", data);
		collectData("#todo li", "todo", data);
		collectData("#memento li", "memento", data);

		function collectData(selector, listKey, data) {
			const items = document.querySelectorAll(selector);
			data.lists[listKey] = [];
			items.forEach(item => {
				const checkbox = item.querySelector('input[type="checkbox"]');
				const span = item.querySelector('span');
				if (span) {
					data.lists[listKey].push({
						content: span.textContent,
						checked: checkbox ? checkbox.checked : false
					});
				}
			});
		}

		const xhr = new XMLHttpRequest();
		xhr.open('POST', '/save');
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.onload = function() {
		  if (xhr.status === 401) {
			// Redirect to login if unauthorized
			window.location.href = '/login.html';
			return;
		  }
		  if (xhr.status === 200) {
			isSaved = true;
			appearing.style = "display:none;";
			if (isNew) {
				isNew = false;
				searchParams.set("new", "false"); 
				window.location.search = searchParams.toString();
			}
		  } else {
			alert("Ошибка сохранения!")
			console.error("Page save failed!");
		  }
		};
		xhr.send(JSON.stringify({ name: fileName + '.json', content: data }));
	};

	function constructCheckList() {
		// Read from check_list.json into object
		fetch("/checklist")
			.then((response) => {
				if (response.status === 401) {
					// Redirect to login if unauthorized
					window.location.href = '/login.html';
					return;
				}
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				return response.json();
			})
			.then((data) => {
				if (!data) return; // Exit if redirected to login
				
				// Construct elements in loop and attach to parent
				data.forEach((text) => {
					const listItem = document.createElement("li");
					const checkbox = document.createElement("input");
					const span = document.createElement("span");

					checkbox.type = "checkbox";
					span.contentEditable = false;
					
					// Clean HTML markup from text - extract text only
					let cleanText = text || '';
					if (cleanText.includes('<')) {
						// If text contains HTML, extract text from it
						const tempDiv = document.createElement('div');
						tempDiv.innerHTML = cleanText;
						cleanText = tempDiv.textContent || tempDiv.innerText || '';
					}
					
					span.textContent = cleanText;

					listItem.appendChild(checkbox);
					listItem.appendChild(span);

					mementoList.appendChild(listItem);
				});
				updateEditability('constructCheckList');
				isSaved = true; // Mark as saved after constructing checklist
			})
			.catch((error) => {
				console.error("Error fetching checklist:", error);
			});
	}

	let checklistUpdateTimeout;
	
	function updateCheckList() {
		// Debounce multiple calls
		clearTimeout(checklistUpdateTimeout);
		checklistUpdateTimeout = setTimeout(() => {
			const mementoItems = document.querySelectorAll("#memento li span");
			const checklistData = [];
			
			mementoItems.forEach((item) => {
				checklistData.push(item.textContent);
			});

			const xhr = new XMLHttpRequest();
			xhr.open('POST', '/checklist');
			xhr.setRequestHeader('Content-Type', 'application/json');
			xhr.onload = function() {
			  if (xhr.status === 401) {
				// Redirect to login if unauthorized
				window.location.href = '/login.html';
				return;
			  }
			  if (xhr.status != 200) {
				console.error("Checklist update failed!");
			  }
			};
			xhr.send(JSON.stringify(checklistData));
		}, 500); // Wait 500ms before actually saving
	}

	function removeTooltip() {
		const tooltip = document.querySelector('.tooltip');
		if (tooltip) {
			tooltip.parentNode.removeChild(tooltip);
		}
	}

	function setCookie(cname, cvalue, exdays) {
		const d = new Date();
		d.setTime(d.getTime() + (exdays*24*60*60*1000));
		const expires = "expires="+ d.toUTCString();
		document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
	}

	function getCookie(cname) {
		const name = cname + "=";
		const decodedCookie = decodeURIComponent(document.cookie);
		const ca = decodedCookie.split(';');
		for(let i = 0; i <ca.length; i++) {
			let c = ca[i];
			while (c.charAt(0) == ' ') {
				c = c.substring(1);
			}
			if (c.indexOf(name) == 0) {
				return c.substring(name.length, c.length);
			}
		}
		return "";
	}

	// Pie chart functionality
	const pieChartButton = document.getElementById('pie_chart_button');
	const pieChartOverlay = document.getElementById('pie_chart_overlay');
	const closePieChartButton = document.getElementById('close_pie_chart_button');

	pieChartButton.addEventListener('click', function() {
		drawPieChart();
		pieChartOverlay.style.display = 'flex';
	});

	closePieChartButton.addEventListener('click', function() {
		pieChartOverlay.style.display = 'none';
	});

	function drawPieChart() {
		const canvas = document.getElementById('pie_chart_canvas');
		const ctx = canvas.getContext('2d');
		
		// Set canvas size
		canvas.width = 400;
		canvas.height = 400;
		
		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		// Define colors for pie chart
		const colors = ['#0048BA', '#B0BF1A', '#7CB9E8', '#C46210', '#00A86B', '#8DB600', '#9966CC', '#FF8C00', '#FFD700', '#FF7F50', '#00FFFF', '#FF6FFF', '#4B5320', '#DE3163', '#FB607F'];
		
		// Get time overlays
		const timeOverlays = document.querySelectorAll('.time_overlay');
		const data = [];
		
		timeOverlays.forEach(overlay => {
			const start = overlay.getAttribute('start');
			const end = overlay.getAttribute('end');
			const content = overlay.textContent.replace('X', '').trim();
			
			if (start && end) {
				const startTime = parseTime(start);
				const endTime = parseTime(end);
				let duration = endTime - startTime;
				
				// Handle overnight periods
				if (duration < 0) {
					duration += 24 * 60; // Add 24 hours in minutes
				}
				
				data.push({
					label: content || 'Unnamed',
					value: duration,
					color: overlay.style.backgroundColor
				});
			}
		});
		
		if (data.length === 0) {
			ctx.font = '16px Arial';
			ctx.fillStyle = '#333';
			ctx.textAlign = 'center';
			ctx.fillText('Диапазоны времени для отображения не найдены', canvas.width / 2, canvas.height / 2);
			return;
		}
		
		// Calculate total
		const total = data.reduce((sum, item) => sum + item.value, 0);
		
		// Draw pie chart
		const centerX = canvas.width / 2;
		const centerY = canvas.height / 2;
		const radius = Math.min(centerX, centerY) - 50;
		
		let currentAngle = -Math.PI / 2; // Start from top
		
		data.forEach((item, index) => {
			const sliceAngle = (item.value / total) * 2 * Math.PI;
			
			// Draw slice
			ctx.beginPath();
			ctx.moveTo(centerX, centerY);
			ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
			ctx.closePath();
			ctx.fillStyle = item.color || colors[index % colors.length];
			ctx.fill();
			ctx.strokeStyle = '#fff';
			ctx.lineWidth = 2;
			ctx.stroke();
			
			// Draw label
			const labelAngle = currentAngle + sliceAngle / 2;
			const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
			const labelY = centerY + Math.sin(labelAngle) * (radius + 20);
			
			ctx.fillStyle = '#333';
			ctx.font = '12px Arial';
			ctx.textAlign = 'center';
			ctx.fillText(item.label, labelX, labelY);
			
			// Draw percentage
			const percentage = ((item.value / total) * 100).toFixed(1);
			ctx.fillText(`${percentage}%`, labelX, labelY + 15);
			
			currentAngle += sliceAngle;
		});
	}
	
	function parseTime(timeString) {
		const [hours, minutes] = timeString.split(':').map(Number);
		return hours * 60 + minutes;
	}

	function getDistance(x1, y1, x2, y2) {
		return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
	}

	function getAngle(x1, y1, x2, y2) {
		return Math.atan2(y2 - y1, x2 - x1);
	}

	function adjustLabelPosition(labelX, labelY, centerX, centerY, minLabelDistance, labelPositions) {
		let adjustedX = labelX;
		let adjustedY = labelY;
		
		// Check for overlaps with existing labels
		for (let pos of labelPositions) {
			const distance = getDistance(adjustedX, adjustedY, pos.x, pos.y);
			if (distance < minLabelDistance) {
				// Adjust position
				const angle = getAngle(centerX, centerY, adjustedX, adjustedY);
				adjustedX = centerX + Math.cos(angle) * (getDistance(centerX, centerY, adjustedX, adjustedY) + minLabelDistance);
				adjustedY = centerY + Math.sin(angle) * (getDistance(centerX, centerY, adjustedY, adjustedY) + minLabelDistance);
			}
		}
		
		return { x: adjustedX, y: adjustedY };
	}

	function checkOverlap(newLabelX, newLabelY, existingLabels, ctx, lineHeight, minLabelDistance) {
		for (let label of existingLabels) {
			const distance = getDistance(newLabelX, newLabelY, label.x, label.y);
			if (distance < minLabelDistance) {
				return true;
			}
		}
		return false;
	}
}
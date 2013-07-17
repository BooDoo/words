var alreadySaved = false,
	draggingMagnet,
	$magnets;

function handleMagnetDragStart(e) {
	// alert("dragstart");
	e.originalEvent.dataTransfer.setData('text/plain', this.innerText); //TODO: Go up a level?
	e.originalEvent.dataTransfer.effectAllowed = 'move';
	draggingMagnet = this;
}

function handleMagnetDragEnd(e) {
	// draggingMagnet = undefined;
}

function handleMagnetDragOver(e) {
	// alert("dragover");

	if ($(e.target).closest(".composerLineContent") ||
		$(e.target).closest(".wordList")) {
		if (e.preventDefault) {
			e.preventDefault();
		}

		e.originalEvent.dataTransfer.dropEffect = 'move';

		return false;
	} else {
		return true;
	}
}

function toggleForce() {
        $(this).removeClass("force").addClass("hidden");
        $(this).siblings().removeClass("hidden").addClass("force");
}

function canSave() {
	return (alreadySaved == false) && ($(".composerLineContent .words").length > 0);
}

function updateSaveState() {
	if (canSave()) {
		$("#saveButton").removeClass("disabled");
	} else {
		$("#saveButton").addClass("disabled");
	}
}

function dropIntoComposer(e) {
	var dropX, dropY;
	dropX = e.originalEvent.x;
	dropY = e.originalEvent.y;

	var realDropTarget = $(e.target).closest(".composerLineContent");
	var insertMagnet = undefined;

	// if we're dragging the word from the word list, clone it
	// otherwise, move it.
	if ($(draggingMagnet).closest(".wordList").length > 0) {
		console.log("dragging from word list; cloning");
		insertMagnet = $(draggingMagnet).clone(true);
	} else if ($(draggingMagnet).closest("#composerDragDrop").length > 0) {
		console.log("dragging from composer; moving");
		insertMagnet = $(draggingMagnet);
	} else {
		console.log("dragging from somewhere else?");
	}

	for (var childIndex = 0; childIndex < realDropTarget.children().length; childIndex++) {
		var child = realDropTarget.children()[childIndex];

		var leftCoord = $(child).offset().left + ($(child).width() / 2);

		if (dropX < leftCoord) {
			console.log("drop X (" + dropX + ") before child " + childIndex + " middle (" + leftCoord + ")");
			$(child).before(insertMagnet);
			draggingMagnet = undefined;
			return false;
		} else {
			console.log("drop X (" + dropX + ") after child " + childIndex + " middle (" + leftCoord + ")");
		}
	}

	console.log("drop X (" + dropX + ") after all children, appending");
	realDropTarget.append(insertMagnet);
	draggingMagnet = undefined;

	alreadySaved = false;
	updateSaveState();
	return false;
}

function dropIntoWordList(e) {
	if ($(draggingMagnet).closest(".wordList").length > 0) {
		console.log("moving from word list; do nothing");
		e.preventDefault();
	} else if ($(draggingMagnet).closest("#composerDragDrop").length > 0) {
		console.log("moving from composer; delete");
		alreadySaved = false;
		$(draggingMagnet).remove();
		e.preventDefault();
	} else {
		console.log("moving from somewhere else?");
	}

	updateSaveState();
}

function clearComposer() {
	$(".composerLineContent").empty();
}

function startEditingAuthor() {
	var dom = $("#authorName")[0];
	dom.focus();
	window.getSelection().selectAllChildren(dom);

	return true;
}

function buildWord(titlebox, word) {
	var magnet = $('<div draggable="true" class="words"><h1 class="magnet en" /><h1 class="magnet jp"></div>');
	magnet.children(".magnet.en").text(word.e);
	magnet.children(".magnet.jp").text(word.j);

        magnet.children().on("click", toggleForce);
	magnet.on("dragstart", handleMagnetDragStart);
	magnet.on("dragend", handleMagnetDragEnd);
	$(titlebox).find('.wordList').append(magnet);
}

function buildWords(titlebox, words) {
	for (var idx in words) {
		buildWord(titlebox, words[idx]);
	}
        $magnets = $('.wordList > .words'); //TODO : load in batches (button? infinite scroll?)
}

function getWords(themeId) {
	$.getJSON('/api/newpoem', function(data) {
		buildWords($("#thematicWords"), data.words);
	});
}

function showSaved() {
	$("#savedMessage").removeClass("hidden");
}

function authorChanged() {
	$("#authorName").removeClass("anonymous");
	$("#authorName").addClass("nonymous");
	$("#authorEditHint").addClass("hidden");
}

function submit() {
	if (!canSave()) {
		return;
	}

	var lines = [];

	$('.composerLineContent').each(function (index) {
		//MAYBE: Support multiple tokens on a line?
		lines[index] = {en: $('.en', this).text(), jp: $('.jp', this).text()};
	});

	var poem = {
		title: $("#composeTitle").text() || "Untitled",
		author: $("#authorName").text(),
		lines: lines
	};

	$.post('/api/submitpoem', poem, showSaved);
	alreadySaved = true;
	updateSaveState();

	// return words;
}

function magnetFilter() {
	var criterion = $(this).val().replace(/ +/g, ' ').toLowerCase();

	$magnets.show().filter(function() {
		var text = $(this).text().replace(/\s+/g, ' ').toLowerCase();
		return !~text.indexOf(criterion);
	}).hide();
}

$(window).load(function () {
	$("#saveButton").click(submit);
	$("#clearButton").click(clearComposer);

	$(".wordList").on("dragover", handleMagnetDragOver);
	$(".wordList").on("drop", dropIntoWordList);

	$(".composerLineContent").on("dragover", handleMagnetDragOver);
	$(".composerLineContent").on("drop", dropIntoComposer);

	$("#authorName").on("keyup", authorChanged);

	$("#authorName").on("focus", startEditingAuthor);
	$("#authorEditHint").click(startEditingAuthor);

	$("#filterBox").on("keyup", magnetFilter);

	getWords(1);

	//console.log("hey hey hey");
});
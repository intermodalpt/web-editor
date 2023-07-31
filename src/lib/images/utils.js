const defaultPageSize = 20;

export class Gallery {
	constructor(asc = true, pageSize = defaultPageSize) {
		this.pageSize = pageSize;
		this.asc = asc;
		this.pictures = [];
		this.seenIds = new Set();
	}

	mergePictures(pictures) {
		const newPictures = pictures.filter((pic) => {
			return !this.seenIds.has(pic.id);
		});

		newPictures.forEach((pic) => {
			this.seenIds.add(pic.id);
		});

		let hasUploadDate = pictures[0]?.upload_date || this.pictures[0]?.upload_date;

		if (hasUploadDate) {
			this.pictures = this.pictures
				.concat(newPictures)
				.sort((a, b) =>
					this.asc
						? (a.capture_date || a.upload_date).localeCompare(b.capture_date || b.upload_date)
						: (b.capture_date || b.upload_date).localeCompare(a.capture_date || a.upload_date)
				);
		} else {
			this.pictures = this.pictures
				.concat(newPictures)
				.sort((a, b) => (this.asc ? a.id - b.id : b.id - a.id));
		}
	}

	dropPicture(id) {
		this.pictures = this.pictures.filter((pic) => pic.id !== id);
	}

	get nextPage() {
		return this.pictures.length / this.pageSize;
	}
}

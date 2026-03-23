import {
	arrayUnion,
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	onSnapshot,
	query,
	serverTimestamp,
	setDoc,
	updateDoc,
	where,
	writeBatch,
} from "firebase/firestore"
import { db } from "../firebase"

export function listenToItems(listId, callback) {
	return onSnapshot(
		collection(db, "shoppingLists", listId, "items"),
		(snapshot) => {
			const items = snapshot.docs.map((itemDoc) => ({
				id: itemDoc.id,
				...itemDoc.data(),
			}))
			callback(items)
		},
	)
}

export function listenToPendingInvites(userId, callback) {
	const invitesQuery = query(
		collection(db, "invites"),
		where("toUid", "==", userId),
		where("status", "==", "pending"),
	)

	return onSnapshot(invitesQuery, (snapshot) => {
		const invites = snapshot.docs
			.map((inviteDoc) => ({
				id: inviteDoc.id,
				...inviteDoc.data(),
			}))
			.sort((a, b) => {
				const aSeconds = a.createdAt?.seconds || 0
				const bSeconds = b.createdAt?.seconds || 0
				return bSeconds - aSeconds
			})

		callback(invites)
	})
}

export async function createListInvite({ listId, fromUser, toEmail }) {
	const normalizedEmail = toEmail.trim().toLowerCase()

	if (!normalizedEmail) {
		throw new Error("Enter an email address")
	}

	if (normalizedEmail === fromUser.email?.toLowerCase()) {
		throw new Error("You cannot invite yourself")
	}

	const usersQuery = query(
		collection(db, "users"),
		where("email", "==", normalizedEmail),
		limit(1),
	)
	const usersSnapshot = await getDocs(usersQuery)

	if (usersSnapshot.empty) {
		throw new Error("No user found with that email")
	}

	const recipientDoc = usersSnapshot.docs[0]
	const recipientUid = recipientDoc.id
	const inviteId = `${listId}_${recipientUid}`
	const listRef = doc(db, "shoppingLists", listId)
	const inviteRef = doc(db, "invites", inviteId)

	const [listSnapshot, inviteSnapshot] = await Promise.all([
		getDoc(listRef),
		getDoc(inviteRef),
	])

	if (!listSnapshot.exists()) {
		throw new Error("List not found")
	}

	const members = listSnapshot.data().members || []
	if (members.includes(recipientUid)) {
		throw new Error("This user already has access")
	}

	if (inviteSnapshot.exists() && inviteSnapshot.data().status === "pending") {
		throw new Error("An invite is already pending for this user")
	}

	await setDoc(inviteRef, {
		listId,
		fromUid: fromUser.uid,
		fromEmail: fromUser.email?.toLowerCase() || "",
		toUid: recipientUid,
		toEmail: normalizedEmail,
		status: "pending",
		createdAt: serverTimestamp(),
		respondedAt: null,
	})
}

export async function acceptInvite(inviteId, currentUser) {
	const inviteRef = doc(db, "invites", inviteId)
	const inviteSnapshot = await getDoc(inviteRef)

	if (!inviteSnapshot.exists()) {
		throw new Error("Invite not found")
	}

	const invite = inviteSnapshot.data()
	if (invite.toUid !== currentUser.uid) {
		throw new Error("You cannot accept this invite")
	}

	if (invite.status !== "pending") {
		throw new Error("This invite has already been handled")
	}

	const batch = writeBatch(db)
	batch.update(doc(db, "shoppingLists", invite.listId), {
		members: arrayUnion(currentUser.uid),
		updatedAt: serverTimestamp(),
	})
	batch.update(inviteRef, {
		status: "accepted",
		respondedAt: serverTimestamp(),
	})

	await batch.commit()
	return invite
}

export async function declineInvite(inviteId, currentUser) {
	const inviteRef = doc(db, "invites", inviteId)
	const inviteSnapshot = await getDoc(inviteRef)

	if (!inviteSnapshot.exists()) {
		throw new Error("Invite not found")
	}

	const invite = inviteSnapshot.data()
	if (invite.toUid !== currentUser.uid) {
		throw new Error("You cannot decline this invite")
	}

	if (invite.status !== "pending") {
		throw new Error("This invite has already been handled")
	}

	await updateDoc(inviteRef, {
		status: "declined",
		respondedAt: serverTimestamp(),
	})

	return invite
}

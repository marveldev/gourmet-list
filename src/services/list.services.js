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
	addDoc,
} from "firebase/firestore"
import { db } from "../firebase"

export function listenToItems(type, listId, callback) {
	if (!listId) return () => {}

	const path =
		type === "private"
			? collection(db, "shoppingLists", listId, "items")
			: collection(db, "sharedLists", listId, "items")

	return onSnapshot(path, (snapshot) => {
		const items = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}))
		callback(items)
	})
}

export function listenToPendingInvites(userId, callback) {
	if (!userId) {
		callback([])
		return () => {}
	}

	const invitesQuery = query(
		collection(db, "invites"),
		where("toUid", "==", userId), // ✅ FIXED
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

export const createSharedList = async (user) => {
	const listRef = await addDoc(collection(db, "sharedLists"), {
		ownerId: user.uid,
		ownerEmail: user.email,
		members: [user.uid],
		name: "Shared List",
		createdAt: serverTimestamp(),
	})

	return listRef.id
}

export const createListInvite = async ({ listId, fromUser, toUid }) => {
	await addDoc(collection(db, "invites"), {
		listId,
		fromUid: fromUser.uid,
		fromEmail: fromUser.email,
		toUid,
		status: "pending",
		createdAt: serverTimestamp(),
	})
}

export async function acceptInvite(inviteId, currentUser) {
	const inviteRef = doc(db, "invites", inviteId)
	const inviteSnapshot = await getDoc(inviteRef)

	if (!inviteSnapshot.exists()) throw new Error("Invite not found")

	const invite = inviteSnapshot.data()

	const batch = writeBatch(db)

	// Add user to shared list members
	const listRef = doc(db, "sharedLists", invite.listId)

	batch.update(listRef, {
		members: arrayUnion(currentUser.uid),
	})

	// mark invite accepted
	batch.update(inviteRef, {
		status: "accepted",
		respondedAt: serverTimestamp(),
	})

	await batch.commit()

	return invite
}

export async function declineInvite(inviteId, currentUser) {
	const normalizedCurrentEmail = currentUser.email?.toLowerCase()
	const inviteRef = doc(db, "invites", inviteId)
	const inviteSnapshot = await getDoc(inviteRef)

	if (!inviteSnapshot.exists()) {
		throw new Error("Invite not found")
	}

	const invite = inviteSnapshot.data()
	if (
		invite.toEmail !== normalizedCurrentEmail &&
		invite.toUid !== currentUser.uid
	) {
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

export function listenToSharedLists(userId, callback) {
	const q = query(
		collection(db, "sharedLists"),
		where("members", "array-contains", userId),
	)

	return onSnapshot(q, (snapshot) => {
		const lists = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}))

		callback(lists)
	})
}

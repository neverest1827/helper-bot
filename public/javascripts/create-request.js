document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.form');
    form.addEventListener('submit', async (e) => {
        await handleFormSubmit(e, form)
    }, {once: true});
})

async function handleFormSubmit(e, form){
    e.preventDefault();
    const formData = new FormData(form);

    const response = await fetch(`/admin/request`, {
        method: 'POST',
        headers: {
            'Accept': 'multipart/form-data',
        },
        body: formData
    })

    const result = await response.json();
    showInfo(result);
}

function showInfo(result) {
    if (result.success) {
        alert('Получилось с первого раза)))')
        window.location.reload();
    } else {
        alert('Да ебана рот, опять ты что то сломал... (--_--)')
    }
}
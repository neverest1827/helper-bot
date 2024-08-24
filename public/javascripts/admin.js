document.addEventListener('DOMContentLoaded', () => {
    addListeners()
})

function addListeners() {
    addSearchListener();
    addOpenBtnListeners();
    addCreateBtnListeners();
    addUpdateListeners();
    addFilterListener();
}

function addOpenBtnListeners() {
    const openBtn = document.querySelectorAll('.form__btn-open');
    openBtn.forEach((el) => {
        el.onclick = () => {
            const form = el.parentNode;
            form.classList.toggle('form--open')
        }
    })
}

function addFilterListener() {
    const filterForm = document.querySelector('.filter');
    filterForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const timeFilter = document.querySelector('select[name="timeFilter"]').value;
        const statusFilter = document.querySelector('select[name="statusFilter"]').value;
        const chatId = document.querySelector('select[name="chatFilter"]').value;

        window.location.href = `/admin?timeFilter=${timeFilter}&statusFilter=${encodeURIComponent(statusFilter)}&chatFilter=${chatId}`;
    });
}

function addCreateBtnListeners() {
    document.querySelectorAll('.header__button').forEach((btn) => {
        btn.addEventListener('click', () => handleClickCreateBtn(btn))
    })
}

async function handleClickCreateBtn(btn) {
    const filter = btn.getAttribute('data-filter');
    const modal = document.querySelector(`.modal__${filter}`);
    const closeBtn = modal.querySelector('.form__btn-close')
    const form = modal.querySelector('.form');

    modal.classList.add('modal--visible');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('modal--visible');
        }, {once: true});
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            await handleFormSubmit(e, form, filter)
        }, {once: true});
    }
}

async function handleFormSubmit(e, form, filter){
    e.preventDefault();
    const formData = new FormData(form);

    const response = await fetch(`/admin/${filter}`, {
        method: 'POST',
        headers: {
            'Accept': 'multipart/form-data',
        },
        body: formData
    })

    const result = await response.json();
    showInfo(result);
}

function addUpdateListeners(){
    document.querySelectorAll('.form__update').forEach((form) => {
        form.addEventListener('submit', (e) => handleFormUpdate(e, form))
    })
}

async function handleFormUpdate(e, form){
    e.preventDefault();
    const id = form.getAttribute('data-id');
    const formData = new FormData(form);

    const response = await fetch(`/admin/update/${id}`, {
        method: 'POST',
        headers: {
            'Accept': 'multipart/form-data',
        },
        body: formData
    })

    const result = await response.json();

    showInfo(result)
}

function showInfo(result) {
    if (result.success) {
        alert('Получилось с первого раза)))')
        window.location.reload();
    } else {
        alert('Да ебана рот, опять ты что то сломал... (--_--)')
    }
}

function addSearchListener(){
    const searchForm = document.querySelector('.header__search-form');
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(searchForm);
        const phoneNumber = formData.get('phoneNumber');

        const url = new URL(window.location.origin + `/admin/find/${encodeURIComponent(phoneNumber)}`);
        window.location.href = url.toString();
    })
}
